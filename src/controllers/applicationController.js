import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { jobModel } from "../models/jobModel.js";
import { userModel } from "../models/userModel.js";
import { applicationModel } from "../models/applicationModel.js";
import { APPLICATION_STATUS } from "../utils/constants.js";

export const applyToJob = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const jobId = req.params.jobId;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const body = req.body || {};

  const coverLetter =
    body.coverLetter === undefined || body.coverLetter === null
      ? null
      : String(body.coverLetter).trim() || null;

  // 1) Fetch job with company
  const job = await jobModel
    .findById(jobId)
    .populate("company", "_id name")
    .exec();

  if (!job) throw new ApiError("Job not found", 404);

  // Job must be open
  if (job.status !== "open") {
    throw new ApiError("This job is not accepting applications", 400);
  }

  // Optional: check expiry
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    throw new ApiError("This job posting has expired", 400);
  }

  // 2) Ensure user has not already applied (defensive, on top of unique index)
  const existing = await applicationModel
    .findOne({ job: job._id, applicant: userId })
    .select("_id")
    .lean()
    .exec();

  if (existing) {
    throw new ApiError("You have already applied to this job", 409);
  }

  // 3) Snapshot resume
  // Prefer explicit resumeUrl from body, fallback to user's profile resume
  let resumeUrl = null;
  let resumePublicId = null;

  if (body.resumeUrl) {
    const r = String(body.resumeUrl).trim();
    if (r) resumeUrl = r;
  } else {
    const user = await userModel
      .findById(userId)
      .select("resumeUrl resumePublicId")
      .lean()
      .exec();

    if (user) {
      resumeUrl = user.resumeUrl || null;
      resumePublicId = user.resumePublicId || null;
    }
  }

  // 4) Build snapshot data from job / company
  const companyId =
    job.company && typeof job.company === "object"
      ? job.company._id
      : job.company;

  const companyNameSnapshot =
    job.company && typeof job.company === "object"
      ? job.company.name || null
      : null;

  const jobLocationSnapshot = job.location
    ? {
        city: job.location.city || null,
        state: job.location.state || null,
        country: job.location.country || null,
        remote: Boolean(job.location.remote),
      }
    : null;

  const jobSalarySnapshot = job.salary
    ? {
        min: typeof job.salary.min === "number" ? job.salary.min : null,
        max: typeof job.salary.max === "number" ? job.salary.max : null,
        currency: job.salary.currency || "INR",
      }
    : null;

  const payload = {
    job: job._id,
    company: companyId,
    applicant: new mongoose.Types.ObjectId(userId),

    resumeUrl,
    resumePublicId,
    coverLetter,

    status: "applied",
    viewed: false,
    rejectedReason: null,
    interviewDate: null,

    jobTitleSnapshot: job.title || null,
    companyNameSnapshot,
    jobLocationSnapshot,
    jobTypeSnapshot: job.jobType || null,
    experienceLevelSnapshot: job.experienceLevel || null,
    jobSalarySnapshot,
  };

  try {
    const application = await applicationModel.create(payload);

    jobModel
      .findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } })
      .catch(() => {});

    return res
      .status(201)
      .json(new ApiResponse(201, { application }, "Application submitted"));
  } catch (err) {
    if (err && err.code === 11000) {
      throw new ApiError("You have already applied to this job", 409);
    }
    throw err;
  }
});

export const listMyApplications = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const q = (req.query.q || "").toString().trim();
  const statusRaw =
    typeof req.query.status !== "undefined"
      ? String(req.query.status).trim()
      : null;
  const companyId = req.query.company ? String(req.query.company).trim() : null;

  const filter = {
    applicant: userId,
  };

  if (statusRaw) {
    const allowedStatuses = new Set(APPLICATION_STATUS);
    if (!allowedStatuses.has(statusRaw)) {
      throw new ApiError(
        `Invalid status; allowed values are: ${APPLICATION_STATUS.join(", ")}`,
        400
      );
    }
    filter.status = statusRaw;
  }

  if (companyId) {
    if (!mongoose.isValidObjectId(companyId)) {
      throw new ApiError("Invalid company id", 400);
    }
    filter.company = companyId;
  }

  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    filter.$or = [{ jobTitleSnapshot: regex }, { companyNameSnapshot: regex }];
  }

  const total = await applicationModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = {
    job: 1,
    company: 1,
    status: 1,
    viewed: 1,
    coverLetter: 1,
    rejectedReason: 1,
    interviewDate: 1,
    jobTitleSnapshot: 1,
    companyNameSnapshot: 1,
    jobLocationSnapshot: 1,
    jobTypeSnapshot: 1,
    experienceLevelSnapshot: 1,
    jobSalarySnapshot: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  const applications = await applicationModel
    .find(filter, projection)
    .populate("job", "title slug status")
    .populate("company", "name slug logoUrl")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
        applications,
      },
      "OK"
    )
  );
});

export const listJobApplications = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await jobModel.findById(jobId).select("_id title");
  if (!job) {
    throw new ApiError("Job not found", 404);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const statusRaw =
    typeof req.query.status !== "undefined"
      ? String(req.query.status).trim()
      : null;

  const filter = { job: jobId };

  if (statusRaw) {
    const allowedStatuses = new Set(APPLICATION_STATUS);
    if (!allowedStatuses.has(statusRaw)) {
      throw new ApiError(
        `Invalid status; allowed values are: ${APPLICATION_STATUS.join(", ")}`,
        400
      );
    }
    filter.status = statusRaw;
  }

  const requestedSort = String(req.query.sort || "-createdAt").trim();
  const ALLOWED_SORTS = new Set([
    "-createdAt",
    "createdAt",
    "status",
    "-status",
  ]);
  const sort = ALLOWED_SORTS.has(requestedSort) ? requestedSort : "-createdAt";

  const total = await applicationModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = {
    applicant: 1,
    status: 1,
    viewed: 1,
    coverLetter: 1,
    resumeUrl: 1,
    rejectedReason: 1,
    interviewDate: 1,
    createdAt: 1,
    jobTitleSnapshot: 1,
    companyNameSnapshot: 1,
    jobLocationSnapshot: 1,
    jobTypeSnapshot: 1,
    experienceLevelSnapshot: 1,
    jobSalarySnapshot: 1,
  };

  const applications = await applicationModel
    .find(filter, projection)
    .populate("applicant", "name email avatarUrl skills")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
        applications,
      },
      "OK"
    )
  );
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid application id", 400);
  }

  const application = await applicationModel
    .findById(id)
    .populate("job", "title slug status company createdBy")
    .populate("company", "name slug logoUrl")
    .populate("applicant", "name email avatarUrl skills")
    .lean()
    .exec();

  if (!application) {
    throw new ApiError("Application not found", 404);
  }

  const role = req.user?.role || null;

  const isApplicant =
    application.applicant &&
    application.applicant._id &&
    application.applicant._id.toString() === userId.toString();

  let isEmployerOwner = false;
  if (application.job && application.job.createdBy) {
    isEmployerOwner =
      application.job.createdBy.toString() === userId.toString();
  }

  const isAdmin = role === "admin";

  if (!isApplicant && !isEmployerOwner && !isAdmin) {
    throw new ApiError("Forbidden", 403);
  }

  const appObj = { ...application };

  if (isApplicant && !isEmployerOwner && !isAdmin) {
    if (Object.prototype.hasOwnProperty.call(appObj, "viewed")) {
      delete appObj.viewed;
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { application: appObj }, "OK"));
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const role = req.user?.role || null;

  if (!userId) throw new ApiError("Unauthorized", 401);

  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid application id", 400);
  }

  const { status, rejectedReason, interviewDate } = req.body || {};

  if (!status) {
    throw new ApiError("Status is required", 400);
  }

  const normalizedStatus = String(status).trim();
  const allowedStatuses = new Set(APPLICATION_STATUS); // ["applied","shortlisted","rejected","interview","hired"]

  if (!allowedStatuses.has(normalizedStatus)) {
    throw new ApiError(
      `Invalid status; allowed values are: ${APPLICATION_STATUS.join(", ")}`,
      400
    );
  }

  // Fetch application + job owner
  const application = await applicationModel
    .findById(id)
    .populate("job", "createdBy title")
    .exec();

  if (!application) {
    throw new ApiError("Application not found", 404);
  }

  // Determine if current user is employer owner of the job
  let isEmployerOwner = false;
  if (application.job && application.job.createdBy) {
    isEmployerOwner =
      application.job.createdBy.toString() === userId.toString();
  }

  const isAdmin = role === "admin";

  if (!isEmployerOwner && !isAdmin) {
    throw new ApiError(
      "Forbidden: you are not allowed to update this application",
      403
    );
  }

  // Now apply status-specific logic
  application.status = normalizedStatus;

  // Always mark as viewed once status is being updated
  application.viewed = true;

  // Handle rejectedReason
  if (normalizedStatus === "rejected") {
    const reason =
      rejectedReason === undefined || rejectedReason === null
        ? null
        : String(rejectedReason).trim() || null;
    application.rejectedReason = reason;
    application.interviewDate = null; // interview no longer relevant
  } else {
    // For any non-rejected status, clear rejectedReason
    application.rejectedReason = null;
  }

  // Handle interviewDate
  if (normalizedStatus === "interview") {
    if (
      interviewDate === null ||
      interviewDate === "" ||
      interviewDate === undefined
    ) {
      // optional: you can decide if missing interviewDate is allowed
      // Here we allow null but you can enforce it required if you want
      application.interviewDate = null;
    } else {
      const date = new Date(interviewDate);
      if (Number.isNaN(date.getTime())) {
        throw new ApiError("Invalid interviewDate", 400);
      }
      application.interviewDate = date;
    }
  } else {
    // For non-interview statuses, you can decide whether to clear interviewDate
    if (normalizedStatus !== "interview") {
      application.interviewDate = null;
    }
  }

  await application.save();

  const appObj = application.toObject();
  delete appObj.__v;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { application: appObj },
        "Application status updated successfully"
      )
    );
});

export const markApplicationViewed = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const role = req.user?.role || null;

  if (!userId) throw new ApiError("Unauthorized", 401);

  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid application id", 400);
  }

  // Fetch application with job creator info
  const application = await applicationModel
    .findById(id)
    .populate("job", "createdBy")
    .exec();

  if (!application) {
    throw new ApiError("Application not found", 404);
  }

  // Determine permissions
  let isEmployerOwner = false;
  if (application.job && application.job.createdBy) {
    isEmployerOwner =
      application.job.createdBy.toString() === userId.toString();
  }

  const isAdmin = role === "admin";

  if (!isEmployerOwner && !isAdmin) {
    throw new ApiError(
      "Forbidden: you are not allowed to mark this application as viewed",
      403
    );
  }

  // Idempotent: if already viewed, do nothing special
  if (!application.viewed) {
    application.viewed = true;
    await application.save();
  }

  const appObj = application.toObject();
  delete appObj.__v;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { application: appObj },
        "Application marked as viewed"
      )
    );
});

export const deleteMyApplication = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const role = req.user?.role || null;

  if (!userId) throw new ApiError("Unauthorized", 401);
  if (role !== "jobseeker") {
    // requireRole("jobseeker") at route level should already enforce this,
    // but we keep this as an extra safety.
    throw new ApiError(
      "Forbidden: only jobseekers can delete applications",
      403
    );
  }

  const id = req.params.id;
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError("Invalid application id", 400);
  }

  const application = await applicationModel.findById(id);
  if (!application) {
    throw new ApiError("Application not found", 404);
  }

  // Ensure this application belongs to the logged-in jobseeker
  if (application.applicant.toString() !== userId.toString()) {
    throw new ApiError(
      "Forbidden: you can only delete your own application",
      403
    );
  }

  const jobId = application.job;

  // Hard delete application
  await application.deleteOne();

  // Best-effort: decrement job.applicationCount
  if (jobId && mongoose.isValidObjectId(jobId)) {
    jobModel
      .findByIdAndUpdate(jobId, { $inc: { applicationCount: -1 } })
      .catch(() => {});
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Application deleted successfully"));
});

export const getJobApplicationsStats = asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await jobModel.findById(jobId).select("_id title");
  if (!job) {
    throw new ApiError("Job not found", 404);
  }

  const rawStats = await applicationModel.aggregate([
    { $match: { job: new mongoose.Types.ObjectId(jobId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = {};
  for (const s of APPLICATION_STATUS) {
    stats[s] = 0;
  }

  rawStats.forEach((row) => {
    const status = row._id;
    const count = row.count || 0;
    if (status && Object.prototype.hasOwnProperty.call(stats, status)) {
      stats[status] = count;
    }
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        job: {
          _id: job._id,
          title: job.title,
        },
        stats,
      },
      "OK"
    )
  );
});

export const getMyApplicationsStats = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const role = req.user?.role || null;

  if (!userId) throw new ApiError("Unauthorized", 401);
  if (role !== "jobseeker") {
    throw new ApiError("Forbidden: only jobseekers can view this", 403);
  }

  const rawStats = await applicationModel.aggregate([
    { $match: { applicant: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = {};
  for (const s of APPLICATION_STATUS) {
    stats[s] = 0;
  }

  rawStats.forEach((row) => {
    const status = row._id;
    const count = row.count || 0;
    if (status && Object.prototype.hasOwnProperty.call(stats, status)) {
      stats[status] = count;
    }
  });

  return res.status(200).json(new ApiResponse(200, { stats }, "OK"));
});

export default {
  applyToJob,
  listMyApplications,
  listJobApplications,
  getApplicationById,
  updateApplicationStatus,
  markApplicationViewed,
  deleteMyApplication,
  getJobApplicationsStats,
  getMyApplicationsStats,
};
