import mongoose from "mongoose";
import { APPLICATION_STATUS } from "../utils/constants.js";

const { Schema } = mongoose;


const jobLocationSnapshotSchema = new Schema(
  {
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    remote: { type: Boolean, default: false },
  },
  { _id: false }
);


const jobSalarySnapshotSchema = new Schema(
  {
    min: { type: Number, default: null },
    max: { type: Number, default: null },
    currency: { type: String, trim: true, default: "INR" },
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    
    job: {
      type: Schema.Types.ObjectId,
      ref: "job",
      required: true,
      index: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "company",
      required: true,
      index: true,
    },

    applicant: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    resumeUrl: { type: String, default: null },
    resumePublicId: { type: String, default: null },

    coverLetter: {
      type: String,
      default: null,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: APPLICATION_STATUS, 
      default: "applied",
      index: true,
    },

    viewed: {
      type: Boolean,
      default: false, 
    },

    rejectedReason: {
      type: String,
      default: null,
      maxlength: 2000,
    },

    interviewDate: {
      type: Date,
      default: null,
    },

    
    jobTitleSnapshot: {
      type: String,
      trim: true,
      default: null,
    },

    companyNameSnapshot: {
      type: String,
      trim: true,
      default: null,
    },

    jobLocationSnapshot: {
      type: jobLocationSnapshotSchema,
      default: null,
    },

    jobTypeSnapshot: {
      type: String,
      trim: true,
      default: null,
    },

    experienceLevelSnapshot: {
      type: String,
      trim: true,
      default: null,
    },

    jobSalarySnapshot: {
      type: jobSalarySnapshotSchema,
      default: null,
    },
  },
  { timestamps: true }
);


applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });


applicationSchema.index({ applicant: 1, createdAt: -1 });
applicationSchema.index({ job: 1, status: 1 });

export const applicationModel = mongoose.model("application", applicationSchema);
export default applicationModel;
