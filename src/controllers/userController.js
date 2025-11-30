import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { userModel } from "../models/userModel.js";
import {
  createEmailVerificationOtp,
  createPasswordResetOtp,
  signAccessToken,
  signRefreshToken,
  signRefreshCookie,
  verifyRefreshToken,
  clearRefreshCookie,
  hashToken,
} from "../utils/tokens.js";
import { sendEmail } from "../utils/emails.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/uploadHelper.js";
import mongoose from "mongoose";

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password)
    throw new ApiError("Missing required fields", 400);

  const allowedRoles = ["jobseeker", "employer"]; // do not allow `admin` from client
  const userRole = allowedRoles.includes(role) ? role : "jobseeker";

  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await userModel.findOne({ email: normalizedEmail });

  if (existing) {
    if (!existing.emailVerified) {
      const expired =
        existing.emailVerificationOtpExpires &&
        existing.emailVerificationOtpExpires.getTime() < Date.now();
      if (expired) {
        await existing.deleteOne(); // stale unverified user: remove and allow new registration
      } else {
        throw new ApiError(
          "Email already in use. Please verify your email.",
          409
        );
      }
    } else {
      throw new ApiError("Email already in use", 409);
    }
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    user = await userModel.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      emailVerified: false,
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      throw new ApiError("Email already in use", 409);
    }
    throw err;
  }

  const { otp, otpHash } = createEmailVerificationOtp();
  const expiresInMin = Number(process.env.VERIFY_OTP_EXPIRES_MIN || 10);

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpires = new Date(
    Date.now() + expiresInMin * 60_000
  );
  user.lastVerificationSentAt = new Date();
  await user.save();

  await sendEmail({
    to: normalizedEmail,
    subject: "Your verification code",
    html: `<p>Your verification OTP is <b>${otp}</b>. It is valid for ${expiresInMin} minutes.</p>`,
    text: `Your OTP is ${otp}`,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, null, "User registered — OTP sent to email"));
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError("Email and OTP are required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError("Invalid email or OTP", 400);

  if (user.emailVerified) throw new ApiError("Email already verified", 400);
  if (!user.emailVerificationOtpHash)
    throw new ApiError("No active OTP. Please request a new one.", 400);
  if (user.emailVerificationOtpExpires < new Date())
    throw new ApiError("OTP expired. Please request a new one.", 400);

  const incomingHash = hashToken(otp);
  if (incomingHash !== user.emailVerificationOtpHash)
    throw new ApiError("Invalid OTP", 400);

  user.emailVerified = true;
  user.emailVerificationOtpHash = null;
  user.emailVerificationOtpExpires = null;
  user.lastVerificationSentAt = null;

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  await user.save();

  signRefreshCookie(res, refreshToken);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken },
        "Email verified — logged in successfully"
      )
    );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new ApiError("Email and password are required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError("Invalid email or password", 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError("Invalid email or password", 401);

  if (!user.emailVerified)
    throw new ApiError("Please verify your email to continue", 403);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
  await user.save();

  signRefreshCookie(res, refreshToken);

  return res
    .status(200)
    .json(new ApiResponse(200, { accessToken }, "Logged in successfully"));
});

export const logout = asyncHandler(async (req, res) => {
  if (req.userId) {
    await userModel.findByIdAndUpdate(req.userId, {
      $unset: { refreshTokenHash: 1 },
    });
    clearRefreshCookie(res);
    return res.json(new ApiResponse(200, null, "Logged out successfully"));
  }

  const incoming =
    req.cookies?.refreshToken ||
    req.headers["x-refresh-token"] ||
    req.body?.refreshToken;
  if (!incoming) throw new ApiError("No active session found", 400);

  try {
    const payload = verifyRefreshToken(incoming);
    await userModel.findByIdAndUpdate(payload.id, {
      $unset: { refreshTokenHash: 1 },
    });
  } catch (err) {
  } finally {
    clearRefreshCookie(res);
    return res.json(new ApiResponse(200, null, "Logged out successfully"));
  }
});

export const refresh = asyncHandler(async (req, res) => {
  const incoming =
    req.cookies?.refreshToken ||
    req.headers["x-refresh-token"] ||
    req.body?.refreshToken;
  if (!incoming) throw new ApiError("No refresh token provided", 401);

  let payload;
  try {
    payload = verifyRefreshToken(incoming);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError("Invalid or expired refresh token", 401);
  }

  const user = await userModel.findById(payload.id);
  if (!user || !user.refreshTokenHash) {
    clearRefreshCookie(res);
    throw new ApiError("Invalid session", 401);
  }

  const match = await bcrypt.compare(incoming, user.refreshTokenHash);
  if (!match) {
    await userModel.findByIdAndUpdate(payload.id, {
      $unset: { refreshTokenHash: 1 },
    });
    clearRefreshCookie(res);
    throw new ApiError("Refresh token mismatch", 401);
  }

  const newRefresh = signRefreshToken(user._id);
  user.refreshTokenHash = await bcrypt.hash(newRefresh, BCRYPT_ROUNDS);
  await user.save();

  const accessToken = signAccessToken(user._id);

  if (req.cookies?.refreshToken) {
    signRefreshCookie(res, newRefresh);
    return res.json(
      new ApiResponse(200, { accessToken }, "Access token refreshed")
    );
  }

  return res.json(
    new ApiResponse(
      200,
      { accessToken, refreshToken: newRefresh },
      "Tokens rotated"
    )
  );
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError("Email is required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userModel.findOne({ email: normalizedEmail });

  if (!user)
    return res.json(
      new ApiResponse(
        200,
        null,
        "If an account exists, a verification code was sent"
      )
    );
  if (user.emailVerified)
    return res.json(new ApiResponse(200, null, "Email already verified"));

  const minMinutes = Number(process.env.RESEND_VERIFY_MINUTES || 5);
  if (
    user.lastVerificationSentAt &&
    Date.now() - user.lastVerificationSentAt.getTime() < minMinutes * 60_000
  ) {
    throw new ApiError("Too many requests. Try again later.", 429);
  }

  const { otp, otpHash } = createEmailVerificationOtp();
  const expiresInMin = Number(process.env.VERIFY_OTP_EXPIRES_MIN || 10);

  user.emailVerificationOtpHash = otpHash;
  user.emailVerificationOtpExpires = new Date(
    Date.now() + expiresInMin * 60_000
  );
  user.lastVerificationSentAt = new Date();
  await user.save();

  await sendEmail({
    to: normalizedEmail,
    subject: "Your verification code",
    html: `<p>Your verification OTP is <b>${otp}</b>. It is valid for ${expiresInMin} minutes.</p>`,
    text: `Your verification OTP is ${otp}. It is valid for ${expiresInMin} minutes.`,
  });

  return res.json(
    new ApiResponse(
      200,
      null,
      "If an account exists, a verification code was sent"
    )
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError("Email is required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userModel.findOne({ email: normalizedEmail });

  if (!user)
    return res.json(
      new ApiResponse(200, null, "If an account exists, an OTP will be sent")
    );

  const rateLimitMin = Number(process.env.RESEND_RESET_MINUTES || 5);
  if (
    user.lastPasswordResetSentAt &&
    Date.now() - user.lastPasswordResetSentAt.getTime() < rateLimitMin * 60_000
  ) {
    throw new ApiError("Too many requests. Try again later.", 429);
  }

  const { otp, otpHash } = createPasswordResetOtp();
  const expiresInMin = Number(process.env.RESET_OTP_EXPIRES_MIN || 10);

  user.passwordResetOtpHash = otpHash;
  user.passwordResetOtpExpires = new Date(Date.now() + expiresInMin * 60_000);
  user.lastPasswordResetSentAt = new Date();
  await user.save();

  await sendEmail({
    to: normalizedEmail,
    subject: "Password Reset Code",
    html: `<p>Your password reset OTP is <b>${otp}</b>. Valid for ${expiresInMin} minutes.</p>`,
    text: `Your password reset OTP is ${otp}`,
  });

  return res.json(
    new ApiResponse(200, null, "If an account exists, an OTP will be sent")
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    throw new ApiError("Email, OTP, and new password are required", 400);

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) throw new ApiError("Invalid OTP or email", 400);

  if (!user.passwordResetOtpHash)
    throw new ApiError("No active password reset request", 400);
  if (user.passwordResetOtpExpires < new Date())
    throw new ApiError("OTP expired. Request a new one.", 400);

  const incomingHash = hashToken(otp);
  if (incomingHash !== user.passwordResetOtpHash)
    throw new ApiError("Invalid OTP", 400);

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpires = null;
  user.lastPasswordResetSentAt = null;
  user.refreshTokenHash = null;

  await user.save();

  return res.json(new ApiResponse(200, null, "Password reset successful"));
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    throw new ApiError("Old password and new password required", 400);

  const user = await userModel.findById(userId).select("+password");
  if (!user) throw new ApiError("User not found", 404);

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) throw new ApiError("Incorrect old password", 401);

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.refreshTokenHash = null; // rotate sessions
  await user.save();

  return res.json(new ApiResponse(200, null, "Password changed successfully"));
});

export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  let query = userModel
    .findById(userId)
    .select(
      "-password -refreshTokenHash -emailVerificationOtpHash -passwordResetOtpHash -__v"
    );

  if (req.user?.role === "employer") {
    query = query.populate("company", "name slug logoUrl");
  }

  const user = await query;
  if (!user) throw new ApiError("User not found", 404);

  return res.status(200).json(new ApiResponse(200, { user }, "OK"));
});

export const getProfileById = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid user id", 400);
  }

  const requestingUserId = req.userId || null;

  if (requestingUserId && requestingUserId.toString() === id.toString()) {
    let query = userModel
      .findById(id)
      .select(
        "-password -refreshTokenHash -emailVerificationOtpHash -passwordResetOtpHash -__v"
      );

    if (req.user?.role === "employer") {
      query = query.populate("company", "name slug logoUrl");
    }

    const user = await query;
    if (!user) throw new ApiError("User not found", 404);

    return res.status(200).json(new ApiResponse(200, { user }, "OK"));
  }

  const user = await userModel
    .findById(id)
    .select("name role avatarUrl bio location skills company")
    .populate("company", "name slug logoUrl");

  if (!user) throw new ApiError("User not found", 404);

  return res.status(200).json(new ApiResponse(200, { user }, "OK"));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);
  if (!mongoose.isValidObjectId(userId))
    throw new ApiError("Invalid user id", 400);

  const user = await userModel.findById(userId);
  if (!user) throw new ApiError("User not found", 404);

  const avatarFile = req.avatarFile || null;
  const resumeFile = req.resumeFile || null;

  const avatarBuffer = avatarFile?.buffer;
  const avatarMimetype = avatarFile?.mimetype;
  const resumeBuffer = resumeFile?.buffer;
  const resumeMimetype = resumeFile?.mimetype;

  const body = req.body || {};

  if (body.name !== undefined)
    user.name = String(body.name).trim() || user.name;

  if (body.bio !== undefined)
    user.bio = body.bio === "" ? null : String(body.bio).trim();

  if (Array.isArray(body.skills)) {
    user.skills = body.skills.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof body.skills === "string") {
    const arr = body.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (arr.length) user.skills = arr;
  }

  user.location = user.location || {};

if (body.location && typeof body.location === "object") {
  if (body.location.city !== undefined)
    user.location.city =
      body.location.city === "" ? null : String(body.location.city).trim();

  if (body.location.state !== undefined)
    user.location.state =
      body.location.state === "" ? null : String(body.location.state).trim();

  if (body.location.country !== undefined)
    user.location.country =
      body.location.country === "" ? null : String(body.location.country).trim();
}

  if (avatarBuffer) {
    try {
      const result = await uploadBufferToCloudinary(avatarBuffer, {
        folder: `jobportal/avatars/${user._id}`,
        resource_type: "image",
        transformation: [{ width: 800, crop: "limit" }],
      });

      if (user.avatarPublicId) {
        try {
          await deleteFromCloudinary(user.avatarPublicId, {
            resource_type: "image",
          });
        } catch (err) {
          console.error("Failed to delete old avatar:", err);
        }
      }

      user.avatarUrl = result.secure_url || result.url || null;
      user.avatarPublicId = result.public_id || null;
    } catch (err) {
      console.error("Avatar upload failed:", err);
      throw new ApiError("Failed to upload avatar", 500);
    }
  }

  if (resumeBuffer) {
    if (resumeMimetype && !["application/pdf"].includes(resumeMimetype)) {
      throw new ApiError("Invalid resume file type; only PDF allowed", 400);
    }

    try {
      const result = await uploadBufferToCloudinary(resumeBuffer, {
        folder: `jobportal/resumes/${user._id}`,
        resource_type: "raw",
        transformation: undefined,
      });

      if (user.resumePublicId) {
        try {
          await deleteFromCloudinary(user.resumePublicId, {
            resource_type: "raw",
          });
        } catch (err) {
          console.error("Failed to delete old resume:", err);
        }
      }

      user.resumeUrl = result.secure_url || result.url || null;
      user.resumePublicId = result.public_id || null;
    } catch (err) {
      console.error("Resume upload failed:", err);
      throw new ApiError("Failed to upload resume", 500);
    }
  }

  await user.save();

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshTokenHash;
  delete userObj.emailVerificationOtpHash;
  delete userObj.passwordResetOtpHash;
  delete userObj.__v;

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: userObj }, "Profile updated successfully")
    );
});

export const listUsers = asyncHandler(async (req, res) => {
  if (!req.userId || req.user?.role !== "admin")
    throw new ApiError("Forbidden", 403);

  const q = (req.query.q || "").toString().trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const role = req.query.role ? String(req.query.role).trim() : null;
  const company = req.query.company ? String(req.query.company).trim() : null;

  const requestedSort = String(req.query.sort || "-createdAt").trim();
  const ALLOWED_SORTS = new Set([
    "-createdAt",
    "createdAt",
    "name",
    "-name",
    "email",
    "-email",
  ]);
  const sort = ALLOWED_SORTS.has(requestedSort) ? requestedSort : "-createdAt";

  const filter = {};
  if (role) filter.role = role;
  if (company) {
    if (!mongoose.isValidObjectId(company))
      throw new ApiError("Invalid company id", 400);
    filter.company = company;
  }

if (q) {
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(safe, "i");
  filter.$or = [{ name: regex }, { email: regex }];
}


  const total = await userModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = { name: 1, email: 1, role: 1, createdAt: 1, company: 1 };

  const users = await userModel
    .find(filter, projection)
    .populate("company", "name slug")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { meta: { total, page, limit, totalPages }, users },
        "OK"
      )
    );
});
