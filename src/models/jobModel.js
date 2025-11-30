import mongoose from "mongoose";
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_STATUS } from "../utils/constants.js";

const { Schema } = mongoose;

const salarySchema = new Schema(
  { min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, default: "INR", trim: true } },
  { _id: false }
);

const locationSchema = new Schema(
  { city: { type: String, trim: true, default: null, index: true },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    remote: { type: Boolean, default: false } },
  { _id: false }
);

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 20000 },

    requirements: [{ type: String, trim: true }],
    responsibilities: [{ type: String, trim: true }],
    salary: { type: salarySchema, default: () => ({}) },

    jobType: { type: String, enum: JOB_TYPES, default: "full-time" },
    experienceLevel: { type: String, enum: EXPERIENCE_LEVELS, default: "junior" },

    location: { type: locationSchema, default: () => ({}) },
    skills: [{ type: String, trim: true }],

    company: { type: Schema.Types.ObjectId, ref: "company", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "user", required: true },

    applicationCount: { type: Number, default: 0 },
    status: { type: String, enum: JOB_STATUS, default: "open", index: true },

    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);


jobSchema.index({ company: 1, jobType: 1, "location.city": 1, status: 1 });

export const jobModel = mongoose.model("job", jobSchema);
export default jobModel;
