import express from "express";

import {
  createCompany,
  listCompanies,
  getCompanyByIdOrSlug,
  updateCompany,
  deleteCompany,
  verifyCompany,
  unverifyCompany,
} from "../controllers/companyController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import { requireRole, requireRoleOrOwner } from "../middlewares/roleMiddleware.js";
import { validateBody } from "../middlewares/validateMiddleware.js";

import {
  uploadSingle,
  DEFAULT_IMAGE_TYPES,
} from "../utils/uploadHelper.js";

import {
  companyCreateSchema,
  companyUpdateSchema,
} from "../utils/JoiSchema/companySchema.js";

import { companyModel } from "../models/companyModel.js";

const router = express.Router();


router.post(
  "/",
  authMiddleware,
  requireRole("employer", "admin"),
  uploadSingle("logo", {
    allowed: DEFAULT_IMAGE_TYPES,
  }),
  validateBody(companyCreateSchema),
  createCompany
);


router.get(
  "/",
  listCompanies
);


router.get(
  "/:idOrSlug",
  getCompanyByIdOrSlug
);


router.patch(
  "/:id",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: companyModel,
    ownerField: "owner",
    param: "id",
  }),

  uploadSingle("logo", {
    allowed: DEFAULT_IMAGE_TYPES,
  }),

  (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    return validateBody(companyUpdateSchema)(req, res, next);
  },

  updateCompany
);


router.delete(
  "/:id",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: companyModel,
    ownerField: "owner",
    param: "id",
  }),
  deleteCompany
);


router.post(
  "/:id/verify",
  authMiddleware,
  requireRole("admin"),
  verifyCompany
);

router.post(
  "/:id/unverify",
  authMiddleware,
  requireRole("admin"),
  unverifyCompany
);

export default router;
