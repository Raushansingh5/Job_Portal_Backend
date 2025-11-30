import Joi from "joi";
import ApiError from "../utils/apiError.js";

export const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(d => d.message);
    const e = new ApiError("Validation error", 400, false);
    e.errors = errors;
    return next(e);
  }
  req.body = value;
  next();
};


