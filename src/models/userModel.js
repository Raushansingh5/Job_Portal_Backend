import mongoose from "mongoose";
import { USER_ROLES } from "../utils/constants.js";

const { Schema } = mongoose;

const locationSchema = new Schema(
  { city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null } },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    password: { type: String, required: true },

    role: { type: String, enum: USER_ROLES, default: "jobseeker" },

    avatarUrl: { type: String, default: null },
    avatarPublicId: { type: String, default: null },
    resumeUrl: { type: String, default: null },
    resumePublicId: { type: String, default: null },

    company: { type: Schema.Types.ObjectId, ref: "company", default: null },

    bio: { type: String, maxlength: 2000, default: null },
    location: { type: locationSchema, default: () => ({}) },
    skills: [{ type: String, trim: true }],

    emailVerified: { type: Boolean, default: false },

    emailVerificationOtpHash: { type: String, default: null },
    emailVerificationOtpExpires: { type: Date, default: null },
    lastVerificationSentAt: { type: Date, default: null },

    passwordResetOtpHash: { type: String, default: null },
    passwordResetOtpExpires: { type: Date, default: null },
    lastPasswordResetSentAt: { type: Date, default: null },

    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true, minimize: false }
);

userSchema.index({ emailVerificationOtpHash: 1 }, { sparse: true });
userSchema.index({ passwordResetOtpHash: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ company: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 1 });


export const userModel = mongoose.model("user", userSchema);
