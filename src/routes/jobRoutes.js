import express from "express";

import {
  createJob,
  listJobs,
  getJobByIdOrSlug,
  updateJob,
  deleteJob,
  updateJobStatus,
  listMyJobs,
} from "../controllers/jobController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import { requireRole, requireRoleOrOwner } from "../middlewares/roleMiddleware.js";
import { validateBody } from "../middlewares/validateMiddleware.js";

import {
  jobCreateSchema,
  jobUpdateSchema,
  jobUpdateStatusSchema,
} from "../utils/JoiSchema/jobSchema.js";


import { jobModel } from "../models/jobModel.js";

const router = express.Router();


router.post(
  "/",
  authMiddleware,
  requireRole("employer", "admin"),
  validateBody(jobCreateSchema),
  createJob
);


router.get(
  "/",
  listJobs
);


router.get(
  "/my",
  authMiddleware,
  requireRole("employer", "admin"),
  listMyJobs
);


router.get(
  "/:idOrSlug",
  getJobByIdOrSlug
);


router.patch(
  "/:id",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: jobModel,
    ownerField: "createdBy",
    param: "id",
  }),
  validateBody(jobUpdateSchema),
  updateJob
);


router.patch(
  "/:id/status",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: jobModel,
    ownerField: "createdBy",
    param: "id",
  }),
  validateBody(jobUpdateStatusSchema),
  updateJobStatus
);


router.delete(
  "/:id",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: jobModel,
    ownerField: "createdBy",
    param: "id",
  }),
  deleteJob
);

export default router;
