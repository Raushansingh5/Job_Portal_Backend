// src/utils/JoiSchema/authAndUserSchema.js
import Joi from "joi";
import { USER_ROLES } from "../constants.js";

const name = Joi.string().trim().min(2).max(100);
const email = Joi.string().trim().lowercase().email().max(254);
const password = Joi.string().min(8).max(128);
const otp = Joi.string()
  .trim()
  .pattern(/^\d{6}$/)
  .messages({ "string.pattern.base": "OTP must be exactly 6 digits" });

export const registerSchema = Joi.object({
  name: name.required(),
  email: email.required(),
  password: password.required(),
  role: Joi.string()
    .valid(...USER_ROLES)
    .optional(),
});

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
});

export const verifyEmailOtpSchema = Joi.object({
  email: email.required(),
  otp: otp.required(),
});

export const resendVerifySchema = Joi.object({
  email: email.required(),
});

export const forgotPasswordSchema = Joi.object({
  email: email.required(),
});

export const resetPasswordSchema = Joi.object({
  email: email.required(),
  otp: otp.required(),
  newPassword: password.required(),
});

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: password.required().disallow(Joi.ref("oldPassword")),
});

export const updateProfileSchema = Joi.object({
  name: name.optional().allow("", null),
  bio: Joi.string().max(2000).allow("", null),

  skills: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()).max(50),
    Joi.string().trim()
  ),

  location: Joi.object({
    city: Joi.string().trim().allow("", null),
    state: Joi.string().trim().allow("", null),
    country: Joi.string().trim().allow("", null),
  }).optional(),
})
  .or("name", "bio", "skills", "location")
  .messages({
    "object.missing": "At least one profile field must be provided to update",
  });

export default {
  registerSchema,
  loginSchema,
  verifyEmailOtpSchema,
  resendVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};
