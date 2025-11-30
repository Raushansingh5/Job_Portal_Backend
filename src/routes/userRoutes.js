import express from "express";

import {
  register,
  login,
  verifyEmailOtp,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  getProfile,
  getProfileById,
  updateProfile,
  listUsers,
} from "../controllers/userController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import logoutMiddleware from "../middlewares/logoutMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { resendVerificationLimiter } from "../middlewares/verificationRateLimit.js";
import { loginLimiter } from "../middlewares/loginLimiter.js";

import { validateBody } from "../middlewares/validateMiddleware.js";

import {
  uploadAvatarAndResume,
  DEFAULT_IMAGE_TYPES,
  DEFAULT_DOCUMENT_TYPES,
} from "../utils/uploadHelper.js";

import {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../utils/JoiSchema/authAndUserSchema.js";

const router = express.Router();


router.post(
  "/register",
  validateBody(registerSchema),
  register
);

router.post(
  "/login",
  loginLimiter, 
  validateBody(loginSchema),
  login
);


router.post(
  "/verify-email-otp",
  validateBody(verifyEmailOtpSchema),
  verifyEmailOtp
);


router.post(
  "/resend-verification",
  resendVerificationLimiter,
  validateBody(resendVerifySchema),
  resendVerification
);


router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword
);


router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword
);


router.post(
  "/change-password",
  authMiddleware,
  validateBody(changePasswordSchema),
  changePassword
);


router.post("/session/refresh", refresh);

router.post("/session/logout", logoutMiddleware, logout);

router.get("/me", authMiddleware, getProfile);


router.patch(
  "/me",
  authMiddleware,
  uploadAvatarAndResume({
    imageAllowed: DEFAULT_IMAGE_TYPES,
    documentAllowed: DEFAULT_DOCUMENT_TYPES,
  }),
  (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    return validateBody(updateProfileSchema)(req, res, next);
  },

  updateProfile
);


router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  listUsers
);

router.get("/:id",authMiddleware, getProfileById);

export default router;
