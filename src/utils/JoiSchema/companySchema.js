// src/utils/JoiSchema/companySchema.js
import Joi from "joi";

const name = Joi.string().trim().min(2).max(200);
const description = Joi.string().trim().max(5000).allow("", null);
const website = Joi.string().trim().uri({ allowRelative: false }).allow("", null);
const industry = Joi.string().trim().max(200).allow("", null);

const locationSchema = Joi.object({
  city: Joi.string().trim().max(100).allow("", null),
  state: Joi.string().trim().max(100).allow("", null),
  country: Joi.string().trim().max(100).allow("", null),
}).optional();

export const companyCreateSchema = Joi.object({
  name: name.required(),
  description: description.optional(),
  website: website.optional(),
  industry: industry.optional(),
  location: locationSchema,
});

export const companyUpdateSchema = Joi.object({
  name: name.optional(),
  description: description.optional(),
  website: website.optional(),
  industry: industry.optional(),
  location: locationSchema,
})
  .or("name", "description", "website", "industry", "location")
  .messages({
    "object.missing": "At least one field must be provided to update the company",
  });

export default {
  companyCreateSchema,
  companyUpdateSchema,
};
