import jwt from "jsonwebtoken";
import { userModel } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return next(new ApiError("Not authorized", 401));
    }

    const token = authHeader.slice(7);

    const secret = process.env.ACCESS_SECRET;
    if (!secret) {
      return next(new ApiError("Server config error: ACCESS_SECRET missing", 500, false));
    }

    const payload = jwt.verify(token, secret);
    const id = payload.id || payload.userId || payload.sub; 
    if (!id) return next(new ApiError("Invalid token payload", 401));

    const user = await userModel.findById(id).select("_id role emailVerified company");
    if (!user) return next(new ApiError("User not found", 401));


    req.userId = user._id.toString();
    req.user = {
      id: req.userId,
      role: user.role,
      emailVerified: user.emailVerified,
      company: user.company ?? null,
    };

    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new ApiError("Invalid or expired token", 401));
    }
    return next(err);
  }
};

export default authMiddleware;
