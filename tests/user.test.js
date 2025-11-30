import request from "supertest";
import app from "../src/app.js";
import { connectTestDb, disconnectTestDb, clearDb } from "./setupTestDb.js";
import bcrypt from "bcryptjs";
import {userModel} from "../src/models/userModel.js";

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

afterEach(async () => {
  await clearDb();
});

describe("Protected Route: GET /api/users/me", () => {
  const email = "meuser@example.com";
  const password = "Password123!";


  const createVerifiedUser = async () => {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name: "Me User",
      email,
      password: hashedPassword,
      emailVerified: true, // Mark as verified for login to work
    });

    return user;
  };

  // 1. Unauthorized access
  it("should return 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/users/me");

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBeDefined();
  });

  
  // 2. Authorized access
 
  it("should return current user when valid JWT token is provided", async () => {
    // 1) First create a verified user
    await createVerifiedUser();

    // 2) Login to get the access token
    const loginRes = await request(app)
      .post("/api/users/login")
      .send({
        email,
        password,
      });

    expect(loginRes.statusCode).toBe(200);

    const accessToken = loginRes.body?.data?.accessToken;
    expect(accessToken).toBeDefined();

    // 3) Call /me with Authorization header
    const meRes = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body?.data?.user?.email).toBe(email.toLowerCase());
    expect(meRes.body?.data?.user?.name).toBe("Me User");
  });
});
