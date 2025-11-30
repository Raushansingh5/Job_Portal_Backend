import express from "express";

import {
  applyToJob,
  listMyApplications,
  listJobApplications,
  getApplicationById,
  updateApplicationStatus,
  markApplicationViewed,
  deleteMyApplication,
  getJobApplicationsStats,
  getMyApplicationsStats,
} from "../controllers/applicationController.js";

import authMiddleware from "../middlewares/authMiddleware.js";
import { requireRole, requireRoleOrOwner } from "../middlewares/roleMiddleware.js";
import { validateBody } from "../middlewares/validateMiddleware.js";

import { jobModel } from "../models/jobModel.js";

import {
  applyToJobSchema,
  updateApplicationStatusSchema,
} from "../utils/JoiSchema/applicationSchema.js";


const router = express.Router();


router.post(
  "/:jobId/apply",
  authMiddleware,
  requireRole("jobseeker"),
  validateBody(applyToJobSchema),
  applyToJob
);


router.get(
  "/my",
  authMiddleware,
  requireRole("jobseeker"),
  listMyApplications
);


router.get(
  "/my/stats",
  authMiddleware,
  requireRole("jobseeker"),
  getMyApplicationsStats
);


router.get(
  "/job/:jobId",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: jobModel,
    ownerField: "createdBy",
    param: "jobId",
  }),
  listJobApplications
);


router.get(
  "/job/:jobId/stats",
  authMiddleware,
  requireRoleOrOwner(["admin"], {
    model: jobModel,
    ownerField: "createdBy",
    param: "jobId",
  }),
  getJobApplicationsStats
);


router.get(
  "/:id",
  authMiddleware,
  getApplicationById
);


router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("employer", "admin"),
  validateBody(updateApplicationStatusSchema),
  updateApplicationStatus
);


router.patch(
  "/:id/viewed",
  authMiddleware,
  requireRole("employer", "admin"),
  markApplicationViewed
);


router.delete(
  "/:id",
  authMiddleware,
  requireRole("jobseeker"),
  deleteMyApplication
);

export default router;
