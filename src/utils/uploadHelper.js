import multer from "multer";
import streamifier from "streamifier";
import { v2 as cloudinary } from "cloudinary";
import ApiError from "./apiError.js";
import dotenv from "dotenv";
dotenv.config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = multer.memoryStorage();
const DEFAULT_MAX_SIZE = Number(process.env.MAX_UPLOAD_SIZE_BYTES || 2_000_000);


export const DEFAULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DEFAULT_DOCUMENT_TYPES = ["application/pdf"];


export function uploadSingle(fieldName = "file", options = {}) {
  const allowed = options.allowed ?? DEFAULT_IMAGE_TYPES;
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;

  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter(req, file, cb) {
      if (!allowed.includes(file.mimetype)) {
        return cb(new ApiError("Invalid file type.", 400));
      }
      cb(null, true);
    },
  }).single(fieldName);

  return (req, res, next) =>
    upload(req, res, (err) => {
      // multer errors can be MulterError or our ApiError
      if (err) return next(err);
      return next();
    });
}

const baseUpload = multer({
  storage,
  limits: { fileSize: DEFAULT_MAX_SIZE },
});

export function uploadAvatarAndResume({
  imageAllowed = DEFAULT_IMAGE_TYPES,
  documentAllowed = DEFAULT_DOCUMENT_TYPES,
} = {}) {
  return (req, res, next) => {
    baseUpload.fields([
      { name: "avatar", maxCount: 1 },
      { name: "resume", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return next(err);

      const avatarFile = req.files?.avatar?.[0];
      const resumeFile = req.files?.resume?.[0];

      if (avatarFile && !imageAllowed.includes(avatarFile.mimetype)) {
        return next(new ApiError("Invalid avatar file type.", 400));
      }

      if (resumeFile && !documentAllowed.includes(resumeFile.mimetype)) {
        return next(new ApiError("Invalid resume file type.", 400));
      }

      if (avatarFile) req.avatarFile = avatarFile;
      if (resumeFile) req.resumeFile = resumeFile;

      next();
    });
  };
}


export function uploadBufferToCloudinary(
  buffer,
  {
    folder = "app/uploads",
    transformation = [{ width: 1600, crop: "limit" }],
    resource_type = "image",
  } = {}
) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type, transformation },
      (error, result) => {
        if (error) return reject(error);
        resolve(result); // secure_url, public_id, etc.
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}


export async function deleteFromCloudinary(
  publicId,
  { resource_type = "image" } = {}
) {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type });
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    return null;
  }
}
