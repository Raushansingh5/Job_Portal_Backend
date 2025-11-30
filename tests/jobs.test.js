import request from "supertest";
import app from "../src/app.js";
import { connectTestDb, disconnectTestDb, clearDb } from "./setupTestDb.js";
import { jobModel } from "../src/models/jobModel.js";
import { companyModel } from "../src/models/companyModel.js";
import { userModel } from "../src/models/userModel.js";
import bcrypt from "bcryptjs";

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

afterEach(async () => {
  await clearDb();
});

describe("Public GET /api/jobs", () => {
  it("should return 200 and an empty array when no jobs exist", async () => {
    const res = await request(app).get("/api/jobs");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    expect(res.body.data.jobs.length).toBe(0);
  });

  it("should return 200 and a list of jobs when jobs exist", async () => {
   
    const passwordHash = await bcrypt.hash("Pass123!", 10);
    const employer = await userModel.create({
      name: "Employer Test",
      email: "emp@test.com",
      password: passwordHash,
      role: "employer",
      emailVerified: true,
    });

   
    const company = await companyModel.create({
      name: "Test Company",
      slug: "test-company",
      description: "A test company",
      website: null,
      industry: "IT",
      location: {
        city: "Delhi",
        state: "Delhi",
        country: "India",
      },
      owner: employer._id,
      verified: true,
      meta: { jobsCount: 2 },
    });

    
    await jobModel.create([
      {
        title: "Frontend Developer",
        slug: "frontend-developer",
        description: "React job",
        company: company._id,
        createdBy: employer._id,
        jobType: "full-time",
        experienceLevel: "junior",
        location: {
          city: "Delhi",
          state: "Delhi",
          country: "India",
          remote: false,
        },
        salary: {
          min: 500000,
          max: 800000,
          currency: "INR",
        },
        skills: ["React", "JavaScript"],
        status: "open",
      },
      {
        title: "Backend Developer",
        slug: "backend-developer",
        description: "Node.js job",
        company: company._id,
        createdBy: employer._id,
        jobType: "full-time",
        experienceLevel: "mid",
        location: {
          city: "Mumbai",
          state: "Maharashtra",
          country: "India",
          remote: false,
        },
        salary: {
          min: 600000,
          max: 900000,
          currency: "INR",
        },
        skills: ["Node.js", "MongoDB"],
        status: "open",
      },
    ]);

   
    const res = await request(app).get("/api/jobs");

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
    expect(res.body.data.jobs.length).toBe(2);

    const titles = res.body.data.jobs.map((j) => j.title);
    expect(titles).toContain("Frontend Developer");
    expect(titles).toContain("Backend Developer");
  });
});
