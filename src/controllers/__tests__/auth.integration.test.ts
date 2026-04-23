import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../app";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  // Clear all collections between tests to avoid state bleed
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const validRegisterPayload = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@example.com",
  password: "securepass123",
};

describe("POST /api/auth/register", () => {
  it("returns 201 and a JWT token for a valid payload", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validRegisterPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("token");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "missing@example.com" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegisterPayload, password: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when email is malformed", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validRegisterPayload, email: "not-an-email" });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    // Register a user to log in with
    await request(app).post("/api/auth/register").send(validRegisterPayload);
  });

  it("returns 200 and a JWT token with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: validRegisterPayload.email,
        password: validRegisterPayload.password,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveProperty("token");
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.token.length).toBeGreaterThan(0);
  });

  it("returns 401 when password is wrong", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: validRegisterPayload.email,
        password: "wrongpassword",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 401 when email does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nobody@example.com",
        password: "somepassword",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 400 when email is malformed", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "bad-email", password: "somepassword" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/users", () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send(validRegisterPayload);
    authToken = res.body.data.token;
  });

  it("returns 200 with a collection of users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("count");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);
  });

  it("does not include password in any user document", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${authToken}`);

    for (const user of res.body.data) {
      expect(user).not.toHaveProperty("password");
      expect(user).toHaveProperty("_id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
    }
  });

  it("returns 401 without a JWT", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });
});
