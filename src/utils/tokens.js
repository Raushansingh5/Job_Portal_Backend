import jwt from "jsonwebtoken";
import crypto from "crypto";
import ApiError from "./apiError.js";
import dotenv from 'dotenv'
dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const TOKEN_ISSUER = process.env.TOKEN_ISSUER || "jobportal";

const COOKIE_PATH = "/api/v1/users/session";

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("ACCESS_SECRET and REFRESH_SECRET must be in .env");
}


export const signAccessToken = (userId) => {
  return jwt.sign(
    { id: String(userId) },
    ACCESS_SECRET,
    {
      expiresIn: "15m",
      issuer: TOKEN_ISSUER,
    }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    throw new ApiError("Invalid or expired access token", 401);
  }
};


export const signRefreshToken = (userId) => {
  return jwt.sign(
    { id: String(userId) },
    REFRESH_SECRET,
    {
      expiresIn: "7d",
      issuer: TOKEN_ISSUER,
    }
  );
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    throw new ApiError("Invalid or expired refresh token", 401);
  }
};

export const signRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
  });
};


export const generateOtp = (digits = 6) => {
  // cryptographically secure numeric OTP
  const randomValue = crypto.randomBytes(4).readUInt32BE(0);
  const otp = (randomValue % (10 ** digits))
    .toString()
    .padStart(digits, "0");

  const otpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  return { otp, otpHash };
};

/* For hashing incoming OTP from user */
export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
};


export const createEmailVerificationOtp = () => generateOtp(6);

export const createPasswordResetOtp = () => generateOtp(6);
