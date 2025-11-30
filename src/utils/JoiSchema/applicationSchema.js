// src/utils/JoiSchema/applicationSchema.js
import Joi from "joi";
import { APPLICATION_STATUS } from "../constants.js";

const coverLetter = Joi.string().trim().max(5000).allow("", null);
const resumeUrl = Joi.string().trim().uri({ allowRelative: false }).allow("", null);

const rejectedReason = Joi.string().trim().max(2000).allow("", null);
const interviewDate = Joi.string().trim().allow("", null);

export const applyToJobSchema = Joi.object({
  coverLetter: coverLetter.optional(),
  resumeUrl: resumeUrl.optional(),
});

export const updateApplicationStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...APPLICATION_STATUS)
    .required(),
  rejectedReason: rejectedReason.optional(),
  interviewDate: interviewDate.optional(),
});

export default {
  applyToJobSchema,
  updateApplicationStatusSchema,
};
