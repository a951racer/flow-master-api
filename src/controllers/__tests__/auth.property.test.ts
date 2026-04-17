// Feature: node-express-mongodb-api
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import * as fc from "fast-check";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../../app";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

/** Clear all collections — called between property iterations that write to DB */
async function clearDb(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

// Arbitraries for valid registration payloads
const validNameArb = fc.stringMatching(/^[A-Za-z]{1,20}$/);

// Use a unique-enough email by combining random parts
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.stringMatching(/^[a-z]{2,4}$/)
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const validPasswordArb = fc
  .string({ minLength: 8, maxLength: 30 })
  .filter((s) => /^[\x20-\x7E]{8,}$/.test(s));

const validRegisterPayloadArb = fc.record({
  firstName: validNameArb,
  lastName: validNameArb,
  email: validEmailArb,
  password: validPasswordArb,
});

/**
 * Property 13: Plaintext password never returned in responses
 * Validates: Requirements 3.5
 */
describe("Property 13: Plaintext password never returned in responses", () => {
  it("registration response body does not contain the submitted password", async () => {
    // Feature: node-express-mongodb-api, Property 13: plaintext_password_never_returned
    await fc.assert(
      fc.asyncProperty(validRegisterPayloadArb, async (payload) => {
        await clearDb();
        const res = await request(app)
          .post("/api/auth/register")
          .send(payload);

        if (res.status === 201) {
          const bodyStr = JSON.stringify(res.body);
          expect(bodyStr).not.toContain(payload.password);
        }
      }),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 14: Auth register round-trip returns a JWT
 * Validates: Requirements 11.1
 */
describe("Property 14: Auth register round-trip returns a JWT", () => {
  it("valid registration payloads always yield 201 + non-empty token", async () => {
    // Feature: node-express-mongodb-api, Property 14: auth_register_returns_jwt
    await fc.assert(
      fc.asyncProperty(validRegisterPayloadArb, async (payload) => {
        await clearDb();
        const res = await request(app)
          .post("/api/auth/register")
          .send(payload);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("data");
        expect(res.body.data).toHaveProperty("token");
        expect(typeof res.body.data.token).toBe("string");
        expect(res.body.data.token.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 15: Auth login returns JWT for valid credentials
 * Validates: Requirements 11.2
 */
describe("Property 15: Auth login returns JWT for valid credentials", () => {
  it("registered user + correct password always yields 200 + token", async () => {
    // Feature: node-express-mongodb-api, Property 15: auth_login_returns_jwt
    await fc.assert(
      fc.asyncProperty(validRegisterPayloadArb, async (payload) => {
        await clearDb();

        // Register first
        const regRes = await request(app)
          .post("/api/auth/register")
          .send(payload);
        expect(regRes.status).toBe(201);

        // Then login with same credentials
        const loginRes = await request(app)
          .post("/api/auth/login")
          .send({ email: payload.email, password: payload.password });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty("data");
        expect(loginRes.body.data).toHaveProperty("token");
        expect(typeof loginRes.body.data.token).toBe("string");
        expect(loginRes.body.data.token.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 16: Invalid credentials always return 401
 * Validates: Requirements 11.3
 */
describe("Property 16: Invalid credentials always return 401", () => {
  it("wrong email always yields 401", async () => {
    // Feature: node-express-mongodb-api, Property 16: invalid_credentials_return_401
    const registeredEmail = "prop16user@example.com";
    const registeredPassword = "validpass123";

    await request(app).post("/api/auth/register").send({
      firstName: "Test",
      lastName: "User",
      email: registeredEmail,
      password: registeredPassword,
    });

    await fc.assert(
      fc.asyncProperty(
        // Generate valid-format emails that are different from the registered one
        validEmailArb.filter((e) => e !== registeredEmail),
        async (wrongEmail) => {
          const res = await request(app)
            .post("/api/auth/login")
            .send({ email: wrongEmail, password: registeredPassword });

          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("wrong password always yields 401", async () => {
    // Feature: node-express-mongodb-api, Property 16: invalid_credentials_return_401
    const registeredEmail = "prop16b@example.com";
    const registeredPassword = "validpass123";

    await request(app).post("/api/auth/register").send({
      firstName: "Test",
      lastName: "User",
      email: registeredEmail,
      password: registeredPassword,
    });

    await fc.assert(
      fc.asyncProperty(
        validPasswordArb.filter((p) => p !== registeredPassword),
        async (wrongPassword) => {
          const res = await request(app)
            .post("/api/auth/login")
            .send({ email: registeredEmail, password: wrongPassword });

          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 20 }
    );
  });
});

/**
 * Property 17: Invalid or expired JWT returns 401 on protected routes
 * Validates: Requirements 11.9
 */
describe("Property 17: Invalid or expired JWT returns 401 on protected routes", () => {
  it("malformed tokens always yield 401 on GET /api/expense-categories", async () => {
    // Feature: node-express-mongodb-api, Property 17: invalid_jwt_returns_401
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(
          // Exclude anything that looks like a valid JWT (3 base64url parts separated by dots)
          (s) => !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s)
        ),
        async (malformedToken) => {
          const res = await request(app)
            .get("/api/expense-categories")
            .set("Authorization", `Bearer ${malformedToken}`);

          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 20 }
    );
  });

  it("expired JWT always yields 401 on GET /api/expense-categories", async () => {
    // Feature: node-express-mongodb-api, Property 17: invalid_jwt_returns_401
    const { config } = await import("../../config/env");
    const expiredToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId().toString() },
      config.jwtSecret,
      { expiresIn: -1 } // already expired
    );

    const res = await request(app)
      .get("/api/expense-categories")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it("missing Authorization header yields 401 on GET /api/expense-categories", async () => {
    // Feature: node-express-mongodb-api, Property 17: invalid_jwt_returns_401
    const res = await request(app).get("/api/expense-categories");
    expect(res.status).toBe(401);
  });
});
