import request from "supertest";
import app from "../src/app.js";
import { connectTestDb, disconnectTestDb, clearDb } from "./setupTestDb.js";

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

afterEach(async () => {
  await clearDb();
});

describe("Health Check API", () => {
  it("should return OK", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: "OK" });
  });
});
