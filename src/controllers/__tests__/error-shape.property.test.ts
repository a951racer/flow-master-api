// Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../app";

let mongod: MongoMemoryServer;
let authToken: string;

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Register a user to get a valid auth token
  const res = await request(app).post("/api/auth/register").send({
    firstName: "Test",
    lastName: "User",
    email: "errorshape@example.com",
    password: "password123",
  });
  authToken = res.body.data.token;
});

afterEach(async () => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

/** Assert that a response body has the required error shape */
function assertErrorShape(body: unknown, expectedStatus: number): void {
  expect(body).toHaveProperty("status");
  expect(body).toHaveProperty("message");
  expect((body as { status: number }).status).toBe(expectedStatus);
  expect(typeof (body as { message: string }).message).toBe("string");
  expect((body as { message: string }).message.length).toBeGreaterThan(0);
}

/**
 * Property 18: Error responses always contain status and message fields
 * Validates: Requirements 12.4, 13.4
 */
describe("Property 18: Error responses always contain status and message fields", () => {

  // ─── 400 Errors ────────────────────────────────────────────────────────────

  describe("400 Bad Request", () => {
    it("POST /api/expense-categories with missing body returns { status: 400, message }", async () => {
      const res = await request(app)
        .post("/api/expense-categories")
        .set(auth())
        .send({});

      expect(res.status).toBe(400);
      assertErrorShape(res.body, 400);
    });

    it("POST /api/expense-categories with invalid body always returns { status: 400, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      await fc.assert(
        fc.asyncProperty(
          // Generate bodies that are missing the required 'category' field or have invalid values
          fc.record({
            category: fc.oneof(
              fc.constant(""),                          // empty string (invalid)
              fc.constant(null),                        // null (invalid)
              fc.string({ minLength: 101, maxLength: 150 }) // too long (invalid)
            ),
          }),
          async (invalidBody) => {
            const res = await request(app)
              .post("/api/expense-categories")
              .set(auth())
              .send(invalidBody);

            expect(res.status).toBe(400);
            assertErrorShape(res.body, 400);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("GET /api/expense-categories/:id with invalid ObjectId returns { status: 400, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      await fc.assert(
        fc.asyncProperty(
          // Generate URL-safe strings that are NOT valid 24-char hex ObjectIds
          // Use only alphanumeric chars to avoid URL encoding issues
          fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/).filter(
            (s) => !/^[a-f\d]{24}$/i.test(s)
          ),
          async (invalidId) => {
            const res = await request(app)
              .get(`/api/expense-categories/${invalidId}`)
              .set(auth());

            expect(res.status).toBe(400);
            assertErrorShape(res.body, 400);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ─── 401 Errors ────────────────────────────────────────────────────────────

  describe("401 Unauthorized", () => {
    it("accessing a protected route without Authorization header returns { status: 401, message }", async () => {
      const res = await request(app).get("/api/expense-categories");

      expect(res.status).toBe(401);
      assertErrorShape(res.body, 401);
    });

    it("accessing a protected route with malformed JWT always returns { status: 401, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      await fc.assert(
        fc.asyncProperty(
          // Generate strings that don't look like valid JWTs (3 base64url parts)
          fc.string({ minLength: 1, maxLength: 100 }).filter(
            (s) => !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s)
          ),
          async (malformedToken) => {
            const res = await request(app)
              .get("/api/expense-categories")
              .set("Authorization", `Bearer ${malformedToken}`);

            expect(res.status).toBe(401);
            assertErrorShape(res.body, 401);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("accessing a protected route with an invalid JWT signed with wrong secret returns { status: 401, message }", async () => {
      // Sign a token with a different secret — it will fail verification
      const jwt = await import("jsonwebtoken");
      const fakeToken = jwt.default.sign({ userId: "fakeid" }, "wrong-secret", { expiresIn: "1h" });

      const res = await request(app)
        .get("/api/expense-categories")
        .set("Authorization", `Bearer ${fakeToken}`);

      expect(res.status).toBe(401);
      assertErrorShape(res.body, 401);
    });
  });

  // ─── 404 Errors ────────────────────────────────────────────────────────────

  describe("404 Not Found", () => {
    it("GET /api/expense-categories/:id with valid ObjectId but non-existent resource returns { status: 404, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      await fc.assert(
        fc.asyncProperty(
          // Generate valid 24-char hex ObjectIds that won't exist in the DB
          fc
            .array(fc.integer({ min: 0, max: 15 }), { minLength: 24, maxLength: 24 })
            .map((digits) => digits.map((d) => d.toString(16)).join("")),
          async (nonExistentId) => {
            const res = await request(app)
              .get(`/api/expense-categories/${nonExistentId}`)
              .set(auth());

            expect(res.status).toBe(404);
            assertErrorShape(res.body, 404);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("requesting a route that does not exist returns { status: 404, message }", async () => {
      const res = await request(app)
        .get("/api/this-route-does-not-exist")
        .set(auth());

      expect(res.status).toBe(404);
      assertErrorShape(res.body, 404);
    });

    it("requesting various non-existent routes always returns { status: 404, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      await fc.assert(
        fc.asyncProperty(
          // Generate path segments that won't match any registered route
          fc
            .array(
              fc.stringMatching(/^[a-z]{3,10}$/),
              { minLength: 1, maxLength: 3 }
            )
            .map((parts) => `/api/nonexistent-${parts.join("-")}`),
          async (path) => {
            const res = await request(app).get(path).set(auth());

            expect(res.status).toBe(404);
            assertErrorShape(res.body, 404);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ─── 500 Errors ────────────────────────────────────────────────────────────

  describe("500 Internal Server Error", () => {
    it("unexpected service error returns { status: 500, message }", async () => {
      // Mock the service to throw an unexpected (non-AppError) error
      const expenseCategoryService = await import("../../services/expense-category.service");
      vi.spyOn(expenseCategoryService, "findAll").mockRejectedValueOnce(
        new Error("Unexpected database failure")
      );

      const res = await request(app)
        .get("/api/expense-categories")
        .set(auth());

      expect(res.status).toBe(500);
      assertErrorShape(res.body, 500);
    });

    it("unexpected errors on any endpoint always return { status: 500, message }", async () => {
      // Feature: node-express-mongodb-api, Property 18: Error responses always contain status and message fields
      const expenseCategoryService = await import("../../services/expense-category.service");

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async (errorMessage) => {
            vi.spyOn(expenseCategoryService, "findAll").mockRejectedValueOnce(
              new Error(errorMessage)
            );

            const res = await request(app)
              .get("/api/expense-categories")
              .set(auth());

            expect(res.status).toBe(500);
            assertErrorShape(res.body, 500);

            vi.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
