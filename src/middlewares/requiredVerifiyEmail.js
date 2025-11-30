import ApiError from "../utils/apiError.js";

const requireVerifiedEmail = (req, res, next) => {
  try {
    // Prefer req.user snapshot to avoid extra DB call
    if (!req.userId) return next(new ApiError("Unauthorized", 401));

    // If req.user exists, use its emailVerified flag
    if (req.user && typeof req.user.emailVerified !== "undefined") {
      if (!req.user.emailVerified) return next(new ApiError("Please verify your email to continue", 403));
      return next();
    }

    // Fallback: if req.user not present, fail safe (you can also fetch the user if desired)
    return next(new ApiError("Unauthorized", 401));
  } catch (err) {
    return next(err);
  }
};

export default requireVerifiedEmail;
