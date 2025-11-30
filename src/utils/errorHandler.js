

import ApiError from "./apiError.js";

export default function errorHandler(err, req, res, next) {
  // 1. Log the error (Production apps use a logger like Winston)
  if (process.env.NODE_ENV !== "production") {
    console.error("🔥 ERROR:", err);
  } else {
    console.error("🔥 ERROR:", err.message);
  }

  // 2. Default values
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // 3. Special handling for known error types

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Duplicate Key (unique fields)
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate field: ${Object.keys(err.keyValue).join(", ")}`;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Token expired";
  }

  // 4. ApiError → respect exposeMessage flag
  if (err instanceof ApiError) {
    status = err.statusCode;

    // If exposeMessage=false, hide internal message from client
    if (err.exposeMessage === false) {
      message = "Something went wrong";
    }
  }

  // 5. Only expose stack trace if NOT in production
  const stack = process.env.NODE_ENV === "production" ? undefined : err.stack;

  // 6. Send final response
  res.status(status).json({
    success: false,
    message,
    stack,
  });
}
