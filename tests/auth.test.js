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

describe("AUTH API Tests", () => {

  const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  };

 
  // 1. TEST: Registration Validation Fail

  it("should fail registration when fields are missing", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ email: "aa@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBeDefined();
  });

 // 2. TEST: Successful Registration
 
  it("should register a user successfully", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send(validUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBeDefined();

    const user = await userModel.findOne({ email: validUser.email });
    expect(user).not.toBeNull();
  });



  // 3. TEST: Login should fail when email not verified
 
  it("should NOT login unverified user", async () => {
    await request(app).post("/api/users/register").send(validUser);

    const res = await request(app)
      .post("/api/users/login")
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    expect(res.statusCode).toBe(403); // "Please verify email"
  });


  
  // 4. TEST: Login should succeed after verifying email

  it("should login successfully when email is verified", async () => {
    const hashed = await bcrypt.hash(validUser.password, 10);

    await userModel.create({
      name: validUser.name,
      email: validUser.email,
      password: hashed,
      emailVerified: true,
    });

    const res = await request(app)
      .post("/api/users/login")
      .send({
        email: validUser.email,
        password: validUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

});
