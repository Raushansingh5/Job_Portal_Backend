// src/controllers/companyController.js
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { companyModel } from "../models/companyModel.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../utils/uploadHelper.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import mongoose from "mongoose";

export const createCompany = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) throw new ApiError("Unauthorized", 401);

  const body = req.body || {};
  const name = body.name ? String(body.name).trim() : null;
  if (!name) throw new ApiError("Company name is required", 400);

  const description =
    body.description !== undefined
      ? body.description === ""
        ? null
        : String(body.description).trim()
      : null;

  const website =
    body.website !== undefined
      ? body.website === ""
        ? null
        : String(body.website).trim()
      : null;

  const industry =
    body.industry !== undefined
      ? body.industry === ""
        ? null
        : String(body.industry).trim()
      : null;

  const location = {
    city: null,
    state: null,
    country: null,
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
  }

  const logoFile = req.file;

  const slug = await generateUniqueSlug(companyModel, name);

  let uploadedLogoResult = null;

  try {
    if (logoFile?.buffer) {
      uploadedLogoResult = await uploadBufferToCloudinary(logoFile.buffer, {
        folder: `jobportal/companies`,
        resource_type: "image",
        transformation: [{ width: 1024, crop: "limit" }],
      });
    }

    const payload = {
      name,
      slug,
      description,
      website,
      industry,
      location,
      owner: userId,
      verified: false,
      meta: { jobsCount: 0 },
    };

    if (uploadedLogoResult) {
      payload.logoUrl =
        uploadedLogoResult.secure_url || uploadedLogoResult.url || null;
      payload.logoPublicId = uploadedLogoResult.public_id || null;
    }

    const company = await companyModel.create(payload);

    return res
      .status(201)
      .json(new ApiResponse(201, { company }, "Company created"));
  } catch (err) {
    if (uploadedLogoResult?.public_id) {
      try {
        await deleteFromCloudinary(uploadedLogoResult.public_id, {
          resource_type: "image",
        });
      } catch {}
    }

    if (err && err.code === 11000) {
      const key = err.keyValue ? Object.keys(err.keyValue)[0] : "duplicate";
      throw new ApiError(`Company ${key} already exists`, 409);
    }

    throw err;
  }
});

export const listCompanies = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const maxLimit = Number(process.env.MAX_PAGE_LIMIT || 100);
  if (limit > maxLimit) limit = maxLimit;

  const q = (req.query.q || "").toString().trim();
  const owner = req.query.owner ? String(req.query.owner).trim() : null;
  const industry = req.query.industry
    ? String(req.query.industry).trim()
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
  const verifiedRaw =
    typeof req.query.verified !== "undefined"
      ? String(req.query.verified).toLowerCase()
      : null;

  const requestedSort = String(req.query.sort || "-createdAt").trim();
  const ALLOWED_SORTS = new Set(["-createdAt", "createdAt", "name", "-name"]);
  const sort = ALLOWED_SORTS.has(requestedSort) ? requestedSort : "-createdAt";

  const filter = {};

  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    filter.$or = [{ name: regex }, { description: regex }];
  }

  if (owner) {
    if (!mongoose.isValidObjectId(owner))
      throw new ApiError("Invalid owner id", 400);
    filter.owner = owner;
  }

  if (industry) filter.industry = industry;

  if (verifiedRaw !== null) {
    if (verifiedRaw === "true" || verifiedRaw === "1") filter.verified = true;
    else if (verifiedRaw === "false" || verifiedRaw === "0")
      filter.verified = false;
    else throw new ApiError("Invalid verified value; use true or false", 400);
  }

  if (locCity) filter["location.city"] = locCity;
  if (locState) filter["location.state"] = locState;
  if (locCountry) filter["location.country"] = locCountry;

  const total = await companyModel.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;

  const projection = {
    name: 1,
    slug: 1,
    description: 1,
    website: 1,
    industry: 1,
    "location.city": 1,
    "location.state": 1,
    "location.country": 1,
    logoUrl: 1,
    verified: 1,
    meta: 1,
    createdAt: 1,
  };

  const companies = await companyModel
    .find(filter, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { meta: { total, page, limit, totalPages }, companies },
        "OK"
      )
    );
});

export const getCompanyByIdOrSlug = asyncHandler(async (req, res) => {
  const idOrSlug = String(req.params.idOrSlug || "").trim();
  if (!idOrSlug) throw new ApiError("Company identifier is required", 400);

  let company;

  const projection = {
    name: 1,
    slug: 1,
    description: 1,
    website: 1,
    industry: 1,
    "location.city": 1,
    "location.state": 1,
    "location.country": 1,
    logoUrl: 1,
    verified: 1,
    meta: 1,
    owner: 1,
    createdAt: 1,
    updatedAt: 1,
  };

  if (mongoose.isValidObjectId(idOrSlug)) {
    company = await companyModel
      .findById(idOrSlug, projection)
      .populate("owner", "name avatarUrl")
      .lean()
      .exec();
  } else {
    company = await companyModel
      .findOne({ slug: idOrSlug }, projection)
      .populate("owner", "name avatarUrl")
      .lean()
      .exec();
  }

  if (!company) throw new ApiError("Company not found", 404);

  if (company.owner && typeof company.owner === "object") {
    company.owner = {
      _id: company.owner._id,
      name: company.owner.name,
      avatarUrl: company.owner.avatarUrl || null,
    };
  } else {
    company.owner = company.owner || null;
  }

  return res.status(200).json(new ApiResponse(200, { company }, "OK"));
});

export const updateCompany = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new ApiError("Invalid company id", 400);
  }

  const company = await companyModel.findById(companyId);
  if (!company) throw new ApiError("Company not found", 404);

  const body = req.body || {};
  let nameChanged = false;

  if (body.name !== undefined) {
    const newName = String(body.name).trim();
    if (!newName) throw new ApiError("Company name cannot be empty", 400);
    if (newName !== company.name) {
      company.name = newName;
      nameChanged = true;
    }
  }

  if (body.description !== undefined) {
    company.description =
      body.description === "" || body.description === null
        ? null
        : String(body.description).trim();
  }

  if (body.website !== undefined) {
    company.website =
      body.website === "" || body.website === null
        ? null
        : String(body.website).trim();
  }

  if (body.industry !== undefined) {
    company.industry =
      body.industry === "" || body.industry === null
        ? null
        : String(body.industry).trim();
  }

  company.location = company.location || {
    city: null,
    state: null,
    country: null,
  };

  if (body.location && typeof body.location === "object") {
    if (body.location.city !== undefined) {
      company.location.city =
        body.location.city === "" || body.location.city === null
          ? null
          : String(body.location.city).trim();
    }
    if (body.location.state !== undefined) {
      company.location.state =
        body.location.state === "" || body.location.state === null
          ? null
          : String(body.location.state).trim();
    }
    if (body.location.country !== undefined) {
      company.location.country =
        body.location.country === "" || body.location.country === null
          ? null
          : String(body.location.country).trim();
    }
  }

  const logoFile = req.file;

  let uploadedLogoResult = null;

  try {
    if (nameChanged) {
      company.slug = await generateUniqueSlug(companyModel, company.name);
    }

    if (logoFile?.buffer) {
      uploadedLogoResult = await uploadBufferToCloudinary(logoFile.buffer, {
        folder: `jobportal/companies`,
        resource_type: "image",
        transformation: [{ width: 1024, crop: "limit" }],
      });

      if (company.logoPublicId) {
        try {
          await deleteFromCloudinary(company.logoPublicId, {
            resource_type: "image",
          });
        } catch {}
      }

      company.logoUrl =
        uploadedLogoResult.secure_url || uploadedLogoResult.url || null;
      company.logoPublicId = uploadedLogoResult.public_id || null;
    }

    await company.save();

    const companyObj = company.toObject();
    delete companyObj.__v;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { company: companyObj },
          "Company updated successfully"
        )
      );
  } catch (err) {
    if (uploadedLogoResult?.public_id) {
      try {
        await deleteFromCloudinary(uploadedLogoResult.public_id, {
          resource_type: "image",
        });
      } catch {}
    }

    if (err && err.code === 11000) {
      const key = err.keyValue ? Object.keys(err.keyValue)[0] : "duplicate";
      throw new ApiError(`Company ${key} already exists`, 409);
    }

    throw err;
  }
});

export const deleteCompany = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new ApiError("Invalid company id", 400);
  }

  const company = await companyModel.findById(companyId);
  if (!company) throw new ApiError("Company not found", 404);

  const logoPublicId = company.logoPublicId || null;

  await company.deleteOne();

  if (logoPublicId) {
    try {
      await deleteFromCloudinary(logoPublicId, { resource_type: "image" });
    } catch {
      // best-effort; don't block response
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Company deleted successfully"));
});

export const verifyCompany = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new ApiError("Invalid company id", 400);
  }

  const company = await companyModel.findById(companyId);
  if (!company) throw new ApiError("Company not found", 404);

  if (company.verified) {
    return res
      .status(200)
      .json(new ApiResponse(200, { company }, "Company already verified"));
  }

  company.verified = true;
  await company.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { company }, "Company verified successfully"));
});

export const unverifyCompany = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    throw new ApiError("Invalid company id", 400);
  }

  const company = await companyModel.findById(companyId);
  if (!company) throw new ApiError("Company not found", 404);

  if (!company.verified) {
    return res
      .status(200)
      .json(new ApiResponse(200, { company }, "Company already unverified"));
  }

  company.verified = false;
  await company.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { company }, "Company has been unverified"));
});

export default {
  createCompany,
  listCompanies,
  getCompanyByIdOrSlug,
  updateCompany,
  deleteCompany,
  verifyCompany,
  unverifyCompany,
};
