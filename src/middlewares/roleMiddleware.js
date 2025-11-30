import { userModel } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) return next(new ApiError("Unauthorized", 401));

      let role = req.user?.role;
      if (!role) {
        const u = await userModel.findById(req.userId).select("role");
        if (!u) return next(new ApiError("User not found", 401));

        role = u.role;
      }

      if (!allowedRoles.includes(role)) {
        return next(new ApiError("Forbidden: insuffficient role", 403));
      }

      if (!req.user) req.user = { id: req.userId, role };

      return next();
    } catch (error) {
      return next(error);
    }
  };
};

const requireRoleOrOwner = (
  roles = [],
  { param = "id", model, ownerField = "owner" } = {}
) => {
  if (!model) {
    throw new Error("requireRoleOrOwner:model is required");
  }

  return async (req, res, next) => {
    try {
      if (!req.userId) return next(new ApiError("Unauthorized", 401));

      const role =
        req.user?.role ??
        (await userModel.findById(req.userId).select("role")).role;

      if (roles.includes(role)) {
        if (!req.user) req.user = { id: req.userId, role };
        return next();
      }

      const resourceId = req.params[param] || req.body[param];
      if (!resourceId) {
        return next(
          new ApiError(
            "Forbidden: missing resource identifier for ownership check",
            403
          )
        );
      }

      const resource = await model.findById(resourceId).select(ownerField);
      if (!resource) return next(new ApiError("Resource not found", 404));

      const ownerId = (resource[ownerField] || "").toString();
      if (req.userId.toString() === ownerId) {
        if (!req.user) req.user = { id: req.userId, role };
        return next();
      }

      return next(new ApiError("Forbidden: you are not the owner", 403));
    } catch (error) {
      return next(error);
    }
  };
};

export { requireRole, requireRoleOrOwner };
export default requireRole;
