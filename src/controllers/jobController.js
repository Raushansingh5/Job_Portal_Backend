import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { jobModel } from "../models/jobModel.js";
import { companyModel } from "../models/companyModel.js";
import { generateUniqueSlug } from "../utils/slugify.js"; 
import { JOB_STATUS } from "../utils/constants.js";

export const createJob = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const body = req.body || {};

  const rawTitle = body.title ? String(body.title).trim() : "";
  if (!rawTitle) throw new ApiError("Job title is required", 400);

  const rawDescription = body.description
    ? String(body.description).trim()
    : "";
  if (!rawDescription) throw new ApiError("Job description is required", 400);

  const companyId = body.company ? String(body.company).trim() : null;
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new ApiError("Valid company id is required", 400);
  }

  const normalizeStringArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }

    return String(value)
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const requirements = normalizeStringArray(body.requirements);
  const responsibilities = normalizeStringArray(body.responsibilities);
  const skills = normalizeStringArray(body.skills);

  const salary = {
    min:
      body.salary && body.salary.min !== undefined
        ? Number(body.salary.min)
        : null,
    max:
      body.salary && body.salary.max !== undefined
        ? Number(body.salary.max)
        : null,
    currency:
      body.salary && body.salary.currency
        ? String(body.salary.currency).trim()
        : "INR",
  };

  if (salary.min !== null && Number.isNaN(salary.min)) {
    throw new ApiError("Invalid salary.min", 400);
  }

  if (salary.max !== null && Number.isNaN(salary.max)) {
    throw new ApiError("Invalid salary.max", 400);
  }

  if (salary.min !== null && salary.max !== null && salary.min > salary.max) {
    throw new ApiError("salary.min cannot be greater than salary.max", 400);
  }

  const location = {
    city: null,
    state: null,
    country: null,
    remote: false,
  };

  if (body.location && typeof body.location === "object") {
    if (body.location.city !== undefined) {
      location.city =
        body.location.city === "" || body.location.city === null
          ? null
          : String(body.location.city).trim();
    }
    if (body.location.state !== undefined) {
      location.state =
        body.location.state === "" || body.location.state === null
          ? null
          : String(body.location.state).trim();
    }
    if (body.location.country !== undefined) {
      location.country =
        body.location.country === "" || body.location.country === null
          ? null
          : String(body.location.country).trim();
    }
    if (body.location.remote !== undefined) {
      location.remote = Boolean(body.location.remote);
    }
  }

  const jobType = body.jobType ? String(body.jobType).trim() : "full-time";
  const experienceLevel = body.experienceLevel
    ? String(body.experienceLevel).trim()
    : "junior";

  let expiresAt = null;
  if (body.expiresAt) {
    const date = new Date(body.expiresAt);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError("Invalid expiresAt date", 400);
    }
    expiresAt = date;
  }

  const company = await companyModel
    .findById(companyId)
    .select("_id owner verified name");

  if (!company) {
    throw new ApiError("Company not found", 404);
  }

  const role = req.user?.role || null;

  if (role === "employer") {
    if (!company.owner || company.owner.toString() !== userId.toString()) {
      throw new ApiError(
        "You are not allowed to post jobs for this company",
        403
      );
    }
  }

  const slug = await generateUniqueSlug(jobModel, rawTitle);

  const payload = {
    title: rawTitle,
    slug,
    description: rawDescription,
    requirements,
    responsibilities,
    salary,
    jobType,
    experienceLevel,
    location,
    skills,
    company: company._id,
    createdBy: userId,
    applicationCount: 0,
    status: "open",
    expiresAt,
  };

  const job = await jobModel.create(payload);

  return res.status(201).json(new ApiResponse(201, { job }, "Job created"));
});

export const listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const q = (req.query.q || "").toString().trim();
  const companyId = req.query.company ? String(req.query.company).trim() : null;
  const jobType = req.query.jobType ? String(req.query.jobType).trim() : null;
  const experienceLevel = req.query.experienceLevel
    ? String(req.query.experienceLevel).trim()
    : null;

  const locCity = req.query["location.city"]
    ? String(req.query["location.city"]).trim()
    : null;
  const locState = req.query["location.state"]
    ? String(req.query["location.state"]).trim()
    : null;
  const locCountry = req.query["location.country"]
    ? String(req.query["location.country"]).trim()
    : null;

  const remoteRaw =
    typeof req.query.remote !== "undefined"
      ? String(req.query.remote).toLowerCase()
      : null;

  const statusRaw =
    typeof req.query.status !== "undefined"
      ? String(req.query.status).trim()
      : null;

  const minSalaryRaw = req.query.minSalary;
  const maxSalaryRaw = req.query.maxSalary;

  let minSalary =
    typeof minSalaryRaw !== "undefined" && minSalaryRaw !== ""
      ? Number(minSalaryRaw)
      : null;
  let maxSalary =
    typeof maxSalaryRaw !== "undefined" && maxSalaryRaw !== ""
      ? Number(maxSalaryRaw)
      : null;

  if (minSalary !== null && Number.isNaN(minSalary)) {
    throw new ApiError("Invalid minSalary", 400);
  }
  if (maxSalary !== null && Number.isNaN(maxSalary)) {
    throw new ApiError("Invalid maxSalary", 400);
  }
  if (minSalary !== null && maxSalary !== null && minSalary > maxSalary) {
    throw new ApiError("minSalary cannot be greater than maxSalary", 400);
  }

  const requestedSort = String(req.query.sort || "-createdAt").trim();
  const ALLOWED_SORTS = new Set([
    "-createdAt",
    "createdAt",
    "title",
    "-title",
    "salary.min",
    "-salary.min",
  ]);
  const sort = ALLOWED_SORTS.has(requestedSort) ? requestedSort : "-createdAt";

  const filter = {};

  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }

  if (companyId) {
    if (!mongoose.isValidObjectId(companyId)) {
      throw new ApiError("Invalid company id", 400);
    }
    filter.company = companyId;
  }

  if (jobType) {
    filter.jobType = jobType;
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  if (locCity) filter["location.city"] = locCity;
  if (locState) filter["location.state"] = locState;
  if (locCountry) filter["location.country"] = locCountry;

  if (remoteRaw !== null) {
    if (remoteRaw === "true" || remoteRaw === "1") {
      filter["location.remote"] = true;
    } else if (remoteRaw === "false" || remoteRaw === "0") {
      filter["location.remote"] = false;
    } else {
      throw new ApiError("Invalid remote value; use true or false", 400);
    }
  }

  if (statusRaw) {
    const allowedStatuses = new Set(JOB_STATUS);
    if (!allowedStatuses.has(statusRaw)) {
      throw new ApiError(
        "Invalid status; allowed values are open, closed, paused",
        400
      );
    }
    filter.status = statusRaw;
  } else {
    filter.status = "open";
  }

  const salaryConditions = {};
  if (minSalary !== null) {
    salaryConditions["salary.min"] = {
      ...(salaryConditions["salary.min"] || {}),
      $gte: minSalary,
    };
  }
  if (maxSalary !== null) {
    salaryConditions["salary.max"] = {
      ...(salaryConditions["salary.max"] || {}),
      $lte: maxSalary,
    };
  }

  Object.assign(filter, salaryConditions);

  const total = await jobModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = {
    title: 1,
    slug: 1,
    description: 1,
    jobType: 1,
    experienceLevel: 1,
    location: 1,
    salary: 1,
    skills: 1,
    status: 1,
    company: 1,
    createdAt: 1,
  };

  const jobs = await jobModel
    .find(filter, projection)
    .populate("company", "name slug logoUrl")
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
        jobs,
      },
      "OK"
    )
  );
});

export const getJobByIdOrSlug = asyncHandler(async (req, res) => {
  const idOrSlug = String(req.params.idOrSlug || "").trim();
  if (!idOrSlug) throw new ApiError("Job identifier is required", 400);

  const projection = {
    title: 1,
    slug: 1,
    description: 1,
    requirements: 1,
    responsibilities: 1,
    salary: 1,
    jobType: 1,
    experienceLevel: 1,
    location: 1,
    skills: 1,
    status: 1,
    applicationCount: 1,
    expiresAt: 1,
    company: 1,
    createdBy: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  let job;

  if (mongoose.isValidObjectId(idOrSlug)) {
    job = await jobModel
      .findById(idOrSlug, projection)
      .populate("company", "name slug logoUrl")
      .populate("createdBy", "name avatarUrl")
      .lean()
      .exec();
  } else {
    job = await jobModel
      .findOne({ slug: idOrSlug }, projection)
      .populate("company", "name slug logoUrl")
      .populate("createdBy", "name avatarUrl")
      .lean()
      .exec();
  }

  if (!job) throw new ApiError("Job not found", 404);

  if (job.createdBy && typeof job.createdBy === "object") {
    job.createdBy = {
      _id: job.createdBy._id,
      name: job.createdBy.name,
      avatarUrl: job.createdBy.avatarUrl || null,
    };
  } else {
    job.createdBy = job.createdBy || null;
  }

  return res.status(200).json(new ApiResponse(200, { job }, "OK"));
});

export const updateJob = asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await jobModel.findById(jobId);
  if (!job) throw new ApiError("Job not found", 404);

  const body = req.body || {};

  let titleChanged = false;

  if (body.title !== undefined) {
    const newTitle = String(body.title).trim();
    if (!newTitle) {
      throw new ApiError("Job title cannot be empty", 400);
    }
    if (newTitle !== job.title) {
      job.title = newTitle;
      titleChanged = true;
    }
  }

  if (body.description !== undefined) {
    const newDescription =
      body.description === "" || body.description === null
        ? ""
        : String(body.description).trim();
    if (!newDescription) {
      throw new ApiError("Job description cannot be empty", 400);
    }
    job.description = newDescription;
  }

  const normalizeStringArray = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return [];
    if (Array.isArray(value)) {
      return value.map((v) => String(v).trim()).filter(Boolean);
    }
    return String(value)
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const requirements = normalizeStringArray(body.requirements);
  if (requirements !== undefined) {
    job.requirements = requirements;
  }

  const responsibilities = normalizeStringArray(body.responsibilities);
  if (responsibilities !== undefined) {
    job.responsibilities = responsibilities;
  }

  const skills = normalizeStringArray(body.skills);
  if (skills !== undefined) {
    job.skills = skills;
  }

  if (body.salary !== undefined) {
    const s = body.salary || {};
    const min =
      s.min !== undefined && s.min !== null && s.min !== ""
        ? Number(s.min)
        : null;
    const max =
      s.max !== undefined && s.max !== null && s.max !== ""
        ? Number(s.max)
        : null;
    const currency =
      s.currency !== undefined && s.currency !== null && s.currency !== ""
        ? String(s.currency).trim()
        : job.salary?.currency || "INR";

    if (min !== null && Number.isNaN(min)) {
      throw new ApiError("Invalid salary.min", 400);
    }
    if (max !== null && Number.isNaN(max)) {
      throw new ApiError("Invalid salary.max", 400);
    }
    if (min !== null && max !== null && min > max) {
      throw new ApiError("salary.min cannot be greater than salary.max", 400);
    }

    job.salary = {
      min,
      max,
      currency,
    };
  }

  if (body.jobType !== undefined) {
    job.jobType = String(body.jobType).trim();
  }

  if (body.experienceLevel !== undefined) {
    job.experienceLevel = String(body.experienceLevel).trim();
  }

  job.location = job.location || {
    city: null,
    state: null,
    country: null,
    remote: false,
  };

  if (body.location && typeof body.location === "object") {
    if (body.location.city !== undefined) {
      job.location.city =
        body.location.city === "" || body.location.city === null
          ? null
          : String(body.location.city).trim();
    }
    if (body.location.state !== undefined) {
      job.location.state =
        body.location.state === "" || body.location.state === null
          ? null
          : String(body.location.state).trim();
    }
    if (body.location.country !== undefined) {
      job.location.country =
        body.location.country === "" || body.location.country === null
          ? null
          : String(body.location.country).trim();
    }
    if (body.location.remote !== undefined) {
      job.location.remote = Boolean(body.location.remote);
    }
  }

  if (body.status !== undefined) {
    const status = String(body.status).trim();
    const allowed= new Set(JOB_STATUS);
    if (!allowed.has(status)) {
      throw new ApiError(
        "Invalid status; allowed values are open, closed, paused",
        400
      );
    }
    job.status = status;
  }

  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === "") {
      job.expiresAt = null;
    } else {
      const date = new Date(body.expiresAt);
      if (Number.isNaN(date.getTime())) {
        throw new ApiError("Invalid expiresAt date", 400);
      }
      job.expiresAt = date;
    }
  }

  try {
    if (titleChanged) {
      job.slug = await generateUniqueSlug(jobModel, job.title);
    }

    await job.save();

    const jobObj = job.toObject();
    delete jobObj.__v;

    return res
      .status(200)
      .json(new ApiResponse(200, { job: jobObj }, "Job updated successfully"));
  } catch (err) {
    if (err && err.code === 11000) {
      const key = err.keyValue ? Object.keys(err.keyValue)[0] : "duplicate";
      throw new ApiError(`Job ${key} already exists`, 409);
    }
    throw err;
  }
});

export const deleteJob = asyncHandler(async (req, res) => {
  const jobId = req.params.id;

  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const job = await jobModel.findById(jobId);
  if (!job) throw new ApiError("Job not found", 404);

  await job.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Job deleted successfully"));
});

export const updateJobStatus = asyncHandler(async (req, res) => {
  const jobId = req.params.id;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new ApiError("Invalid job id", 400);
  }

  const { status } = req.body || {};
  if (!status) {
    throw new ApiError("Status is required", 400);
  }

  const normalizedStatus = String(status).trim();
  const allowedStatuses = new Set(JOB_STATUS);

  if (!allowedStatuses.has(normalizedStatus)) {
    throw new ApiError(
      "Invalid status; allowed values are open, closed, paused",
      400
    );
  }

  const job = await jobModel.findById(jobId);
  if (!job) throw new ApiError("Job not found", 404);

  job.status = normalizedStatus;
  await job.save();

  const jobObj = job.toObject();
  delete jobObj.__v;

  return res
    .status(200)
    .json(
      new ApiResponse(200, { job: jobObj }, "Job status updated successfully")
    );
});

export const listMyJobs = asyncHandler(async (req, res) => {
  if (!req.userId) throw new ApiError("Unauthorized", 401);

  const role = req.user?.role || null;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const statusRaw =
    typeof req.query.status !== "undefined"
      ? String(req.query.status).trim()
      : null;
  const companyId = req.query.company ? String(req.query.company).trim() : null;
  const jobType = req.query.jobType ? String(req.query.jobType).trim() : null;
  const experienceLevel = req.query.experienceLevel
    ? String(req.query.experienceLevel).trim()
    : null;

  const ownerRaw = req.query.owner ? String(req.query.owner).trim() : null;

  const filter = {};

  if (role === "employer") {
    filter.createdBy = req.userId;
  } else if (role === "admin") {
    if (ownerRaw) {
      if (!mongoose.isValidObjectId(ownerRaw)) {
        throw new ApiError("Invalid owner id", 400);
      }
      filter.createdBy = ownerRaw;
    }
  } else {
    throw new ApiError("Forbidden", 403);
  }

  if (statusRaw) {
   const allowedStatuses = new Set(JOB_STATUS);
    if (!allowedStatuses.has(statusRaw)) {
      throw new ApiError(
        "Invalid status; allowed values are open, closed, paused",
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

  if (jobType) {
    filter.jobType = jobType;
  }
  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  const total = await jobModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = {
    title: 1,
    slug: 1,
    status: 1,
    jobType: 1,
    experienceLevel: 1,
    location: 1,
    salary: 1,
    company: 1,
    createdAt: 1,
    expiresAt: 1,
    applicationCount: 1,
  };

  const jobs = await jobModel
    .find(filter, projection)
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
        jobs,
      },
      "OK"
    )
  );
});

export default {
  createJob,
  listJobs,
  getJobByIdOrSlug,
  updateJobStatus,
  deleteJob,
  updateJob,
  listMyJobs,
};
