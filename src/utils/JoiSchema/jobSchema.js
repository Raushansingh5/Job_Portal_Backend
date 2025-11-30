// src/utils/JoiSchema/jobSchema.js
import Joi from "joi";
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_STATUS } from "../constants.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message("Invalid id format");

const stringList = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim()),
  Joi.string().trim()
);

const locationSchema = Joi.object({
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  country: Joi.string().trim().allow("", null),
  remote: Joi.boolean().optional(),
}).optional();

const salarySchema = Joi.object({
  min: Joi.number().min(0).allow(null),
  max: Joi.number().min(0).allow(null),
  currency: Joi.string().trim().allow("", null),
}).optional();

export const jobCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(300).required(),
  description: Joi.string().trim().min(3).max(20000).required(),

  company: objectId.required(),

  requirements: stringList.optional(),
  responsibilities: stringList.optional(),
  skills: stringList.optional(),

  salary: salarySchema.optional(),

  jobType: Joi.string().valid(...JOB_TYPES).optional(),
  experienceLevel: Joi.string().valid(...EXPERIENCE_LEVELS).optional(),

  location: locationSchema,

  expiresAt: Joi.date().iso().optional(),
});

export const jobUpdateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(300),
  description: Joi.string().trim().min(3).max(20000).optional(),

  requirements: stringList,
  responsibilities: stringList,
  skills: stringList,

  salary: salarySchema,
  jobType: Joi.string().valid(...JOB_TYPES),
  experienceLevel: Joi.string().valid(...EXPERIENCE_LEVELS),

  location: locationSchema,

  status: Joi.string().valid(...JOB_STATUS),

  expiresAt: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow("", null)
  ),
})
  .or(
    "title",
    "description",
    "requirements",
    "responsibilities",
    "skills",
    "salary",
    "jobType",
    "experienceLevel",
    "location",
    "status",
    "expiresAt"
  )
  .messages({
    "object.missing": "At least one field must be provided to update the job",
  });

export const jobUpdateStatusSchema = Joi.object({
  status: Joi.string().valid(...JOB_STATUS).required(),
});

export default {
  jobCreateSchema,
  jobUpdateSchema,
  jobUpdateStatusSchema,
};
