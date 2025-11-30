import jwt from "jsonwebtoken";
import { userModel } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const logoutMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  // no token → continue as unauthenticated
  if (!authHeader.startsWith("Bearer ")) {
    req.authenticated = false;
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.ACCESS_SECRET;
    if (!secret) throw new ApiError("Server config error: ACCESS_SECRET missing", 500, false);

    const payload = jwt.verify(token, secret);
    const id = payload.id || payload.userId || payload.sub;
    if (!id) {
      req.authenticated = false;
      return next();
    }

    const user = await userModel.findById(id).select("_id role emailVerified company");
    if (!user) {
      req.authenticated = false;
      return next();
    }

    req.userId = user._id.toString();
    req.user = {
      id: req.userId,
      role: user.role,
      emailVerified: user.emailVerified,
      company: user.company ?? null,
    };
    req.authenticated = true;
    return next();
  } catch (err) {
    
    req.authenticated = false;
    return next();
  }
};

export default logoutMiddleware;
