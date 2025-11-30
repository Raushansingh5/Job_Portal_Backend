import mongoose from "mongoose";

const { Schema } = mongoose;

const locationSchema = new Schema(
  {
    city: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const companySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim:true, maxlength: 200 },
    description: { type: String, default: null, maxlength: 5000, trim: true },
    website: { type: String, default: null, trim: true },
    logoUrl: { type: String, default: null },
    logoPublicId: { type: String, default: null },
    location: { type: locationSchema, default: () => ({}) },
    industry: { type: String, default: null, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: "user", required: true },
    verified: { type: Boolean, default: false },
    meta: { jobsCount: { type: Number, default: 0 } },
  },
  { timestamps: true , minimize:false}
);



export const companyModel = mongoose.model("company", companySchema);
export default companyModel;
