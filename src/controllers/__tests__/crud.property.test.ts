// Feature: node-express-mongodb-api
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  // Clear all collections
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }
  // Register a fresh user and grab a token
  const res = await request(app).post("/api/auth/register").send({
    firstName: "Test",
    lastName: "User",
    email: "testuser@example.com",
    password: "password123",
  });
  authToken = res.body.data.token;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function clearDb() {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }
  // Re-register user after clearing
  const res = await request(app).post("/api/auth/register").send({
    firstName: "Test",
    lastName: "User",
    email: "testuser@example.com",
    password: "password123",
  });
  authToken = res.body.data.token;
}

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

async function createExpenseCategory(category = "TestCat") {
  const res = await request(app)
    .post("/api/expense-categories")
    .set(auth())
    .send({ category });
  return res.body.data._id as string;
}

async function createPaymentSource(source = "TestSource") {
  const res = await request(app)
    .post("/api/payment-sources")
    .set(auth())
    .send({ source });
  return res.body.data._id as string;
}

async function createPeriod(startDate = "2024-01-01", endDate = "2024-01-14") {
  const res = await request(app)
    .post("/api/periods")
    .set(auth())
    .send({ startDate, endDate });
  return res.body.data._id as string;
}

async function createExpense(categoryId: string, paymentSourceId: string) {
  const res = await request(app)
    .post("/api/expenses")
    .set(auth())
    .send({
      dayOfMonth: 1,
      amount: 100,
      type: "expense",
      payee: "TestPayee",
      required: true,
      category: categoryId,
      paymentSource: paymentSourceId,
      inactive: false,
    });
  return res.body.data._id as string;
}

async function createIncome() {
  const res = await request(app)
    .post("/api/incomes")
    .set(auth())
    .send({
      dayOfMonth: 1,
      amount: 1000,
      source: "TestSource",
      isPaycheck: true,
      inactive: false,
    });
  return res.body.data._id as string;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const categoryArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const sourceArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const startDateArb = fc
  .tuple(
    fc.integer({ min: 2000, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 })
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

// Generates a valid [startDate, endDate] pair where endDate > startDate
const periodDatesArb = fc
  .tuple(
    fc.integer({ min: 2000, max: 2029 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 14 }),
    fc.integer({ min: 1, max: 14 })
  )
  .map(([y, m, d, offset]) => {
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + offset + 1);
    const fmt = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    return { startDate: fmt(start), endDate: fmt(end) };
  });

// ─── ExpenseCategory ─────────────────────────────────────────────────────────

describe("ExpenseCategory", () => {
  /**
   * Property 2: Created documents always include base fields
   * Validates: Requirements 0.2, 0.4, 13.2
   */
  it("P2: POST always returns _id, createdAt, updatedAt", async () => {
    // Feature: node-express-mongodb-api, Property 2: created_documents_include_base_fields
    await fc.assert(
      fc.asyncProperty(categoryArb, async (category) => {
        await clearDb();
        const res = await request(app)
          .post("/api/expense-categories")
          .set(auth())
          .send({ category });
        expect(res.status).toBe(201);
        expect(res.body.data._id).toBeTruthy();
        expect(res.body.data.createdAt).toBeTruthy();
        expect(res.body.data.updatedAt).toBeTruthy();
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property 3: Single-resource response shape
   * Validates: Requirements 6.1, 8.1, 9.1
   */
  it("P3: POST, GET by id, PUT responses always have a data field", async () => {
    // Feature: node-express-mongodb-api, Property 3: single_resource_response_shape
    await fc.assert(
      fc.asyncProperty(categoryArb, categoryArb, async (cat1, cat2) => {
        await clearDb();
        const postRes = await request(app)
          .post("/api/expense-categories")
          .set(auth())
          .send({ category: cat1 });
        expect(postRes.status).toBe(201);
        expect(postRes.body).toHaveProperty("data");

        const id = postRes.body.data._id;
        const getRes = await request(app)
          .get(`/api/expense-categories/${id}`)
          .set(auth());
        expect(getRes.status).toBe(200);
        expect(getRes.body).toHaveProperty("data");

        const putRes = await request(app)
          .put(`/api/expense-categories/${id}`)
          .set(auth())
          .send({ category: cat2 });
        expect(putRes.status).toBe(200);
        expect(putRes.body).toHaveProperty("data");
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property 4: Collection response shape and count consistency
   * Validates: Requirements 6.1
   */
  it("P4: GET all always has data array and count === data.length", async () => {
    // Feature: node-express-mongodb-api, Property 4: collection_response_shape_and_count_consistency
    await fc.assert(
      fc.asyncProperty(fc.array(categoryArb, { minLength: 1, maxLength: 5 }), async (categories) => {
        await clearDb();
        for (const category of categories) {
          await request(app).post("/api/expense-categories").set(auth()).send({ category });
        }
        const res = await request(app).get("/api/expense-categories").set(auth());
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty("count");
        expect(res.body.count).toBe(res.body.data.length);
      }),
      { numRuns: 10 }
    );
  });

  /**
   * Property 5: Create round-trip preserves submitted fields
   * Validates: Requirements 13.3
   */
  it("P5: POST response contains all submitted fields with original values", async () => {
    // Feature: node-express-mongodb-api, Property 5: create_round_trip_preserves_submitted_fields
    await fc.assert(
      fc.asyncProperty(categoryArb, async (category) => {
        await clearDb();
        const res = await request(app)
          .post("/api/expense-categories")
          .set(auth())
          .send({ category });
        expect(res.status).toBe(201);
        expect(res.body.data.category).toBe(category);
      }),
      { numRuns: 10 }
    );
  });
});

// ─── PaymentSource ────────────────────────────────────────────────────────────

describe("PaymentSource", () => {
  it("P2: POST always returns _id, createdAt, updatedAt", async () => {
    // Feature: node-express-mongodb-api, Property 2: created_documents_include_base_fields
    await fc.assert(
      fc.asyncProperty(sourceArb, async (source) => {
        await clearDb();
        const res = await request(app)
          .post("/api/payment-sources")
          .set(auth())
          .send({ source });
        expect(res.status).toBe(201);
        expect(res.body.data._id).toBeTruthy();
        expect(res.body.data.createdAt).toBeTruthy();
        expect(res.body.data.updatedAt).toBeTruthy();
      }),
      { numRuns: 10 }
    );
  });

  it("P3: POST, GET by id, PUT responses always have a data field", async () => {
    // Feature: node-express-mongodb-api, Property 3: single_resource_response_shape
    await fc.assert(
      fc.asyncProperty(sourceArb, sourceArb, async (src1, src2) => {
        await clearDb();
        const postRes = await request(app)
          .post("/api/payment-sources")
          .set(auth())
          .send({ source: src1 });
        expect(postRes.status).toBe(201);
        expect(postRes.body).toHaveProperty("data");

        const id = postRes.body.data._id;
        const getRes = await request(app).get(`/api/payment-sources/${id}`).set(auth());
        expect(getRes.status).toBe(200);
        expect(getRes.body).toHaveProperty("data");

        const putRes = await request(app)
          .put(`/api/payment-sources/${id}`)
          .set(auth())
          .send({ source: src2 });
        expect(putRes.status).toBe(200);
        expect(putRes.body).toHaveProperty("data");
      }),
      { numRuns: 10 }
    );
  });

  it("P4: GET all always has data array and count === data.length", async () => {
    // Feature: node-express-mongodb-api, Property 4: collection_response_shape_and_count_consistency
    await fc.assert(
      fc.asyncProperty(fc.array(sourceArb, { minLength: 1, maxLength: 5 }), async (sources) => {
        await clearDb();
        for (const source of sources) {
          await request(app).post("/api/payment-sources").set(auth()).send({ source });
        }
        const res = await request(app).get("/api/payment-sources").set(auth());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.count).toBe(res.body.data.length);
      }),
      { numRuns: 10 }
    );
  });

  it("P5: POST response contains all submitted fields with original values", async () => {
    // Feature: node-express-mongodb-api, Property 5: create_round_trip_preserves_submitted_fields
    await fc.assert(
      fc.asyncProperty(sourceArb, async (source) => {
        await clearDb();
        const res = await request(app)
          .post("/api/payment-sources")
          .set(auth())
          .send({ source });
        expect(res.status).toBe(201);
        expect(res.body.data.source).toBe(source);
      }),
      { numRuns: 10 }
    );
  });
});

// ─── Expense ──────────────────────────────────────────────────────────────────

describe("Expense", () => {
  it("P2: POST always returns _id, createdAt, updatedAt", async () => {
    // Feature: node-express-mongodb-api, Property 2: created_documents_include_base_fields
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 10000, noNaN: true }),
        expenseTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, type, payee, required) => {
          await clearDb();
          const catId = await createExpenseCategory();
          const psId = await createPaymentSource();
          const res = await request(app)
            .post("/api/expenses")
            .set(auth())
            .send({ dayOfMonth, amount, type, payee, required, category: catId, paymentSource: psId, inactive: false });
          expect(res.status).toBe(201);
          expect(res.body.data._id).toBeTruthy();
          expect(res.body.data.createdAt).toBeTruthy();
          expect(res.body.data.updatedAt).toBeTruthy();
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P3: POST, GET by id, PUT responses always have a data field", async () => {
    // Feature: node-express-mongodb-api, Property 3: single_resource_response_shape
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 10000, noNaN: true }),
        expenseTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, type, payee, required) => {
          await clearDb();
          const catId = await createExpenseCategory();
          const psId = await createPaymentSource();
          const payload = { dayOfMonth, amount, type, payee, required, category: catId, paymentSource: psId, inactive: false };

          const postRes = await request(app).post("/api/expenses").set(auth()).send(payload);
          expect(postRes.status).toBe(201);
          expect(postRes.body).toHaveProperty("data");

          const id = postRes.body.data._id;
          const getRes = await request(app).get(`/api/expenses/${id}`).set(auth());
          expect(getRes.status).toBe(200);
          expect(getRes.body).toHaveProperty("data");

          const putRes = await request(app).put(`/api/expenses/${id}`).set(auth()).send(payload);
          expect(putRes.status).toBe(200);
          expect(putRes.body).toHaveProperty("data");
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P4: GET all always has data array and count === data.length", async () => {
    // Feature: node-express-mongodb-api, Property 4: collection_response_shape_and_count_consistency
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            dayOfMonth: fc.integer({ min: 1, max: 31 }),
            amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            type: expenseTypeArb,
            payee: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            required: fc.boolean(),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (expenses) => {
          await clearDb();
          const catId = await createExpenseCategory();
          const psId = await createPaymentSource();
          for (const e of expenses) {
            await request(app).post("/api/expenses").set(auth()).send({ ...e, category: catId, paymentSource: psId, inactive: false });
          }
          const res = await request(app).get("/api/expenses").set(auth());
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBe(res.body.data.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P5: POST response contains all submitted fields with original values", async () => {
    // Feature: node-express-mongodb-api, Property 5: create_round_trip_preserves_submitted_fields
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 10000, noNaN: true }),
        expenseTypeArb,
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, type, payee, required) => {
          await clearDb();
          const catId = await createExpenseCategory();
          const psId = await createPaymentSource();
          const payload = { dayOfMonth, amount, type, payee, required, category: catId, paymentSource: psId, inactive: false };
          const res = await request(app).post("/api/expenses").set(auth()).send(payload);
          expect(res.status).toBe(201);
          expect(res.body.data.dayOfMonth).toBe(dayOfMonth);
          expect(res.body.data.amount).toBe(amount);
          expect(res.body.data.type).toBe(type);
          expect(res.body.data.payee).toBe(payee);
          expect(res.body.data.required).toBe(required);
          expect(res.body.data.inactive).toBe(false);
          expect(String(res.body.data.category)).toBe(catId);
          expect(String(res.body.data.paymentSource)).toBe(psId);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ─── Income ───────────────────────────────────────────────────────────────────

describe("Income", () => {
  it("P2: POST always returns _id, createdAt, updatedAt", async () => {
    // Feature: node-express-mongodb-api, Property 2: created_documents_include_base_fields
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 100000, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, source, isPaycheck) => {
          await clearDb();
          const res = await request(app)
            .post("/api/incomes")
            .set(auth())
            .send({ dayOfMonth, amount, source, isPaycheck, inactive: false });
          expect(res.status).toBe(201);
          expect(res.body.data._id).toBeTruthy();
          expect(res.body.data.createdAt).toBeTruthy();
          expect(res.body.data.updatedAt).toBeTruthy();
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P3: POST, GET by id, PUT responses always have a data field", async () => {
    // Feature: node-express-mongodb-api, Property 3: single_resource_response_shape
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 100000, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, source, isPaycheck) => {
          await clearDb();
          const payload = { dayOfMonth, amount, source, isPaycheck, inactive: false };
          const postRes = await request(app).post("/api/incomes").set(auth()).send(payload);
          expect(postRes.status).toBe(201);
          expect(postRes.body).toHaveProperty("data");

          const id = postRes.body.data._id;
          const getRes = await request(app).get(`/api/incomes/${id}`).set(auth());
          expect(getRes.status).toBe(200);
          expect(getRes.body).toHaveProperty("data");

          const putRes = await request(app).put(`/api/incomes/${id}`).set(auth()).send(payload);
          expect(putRes.status).toBe(200);
          expect(putRes.body).toHaveProperty("data");
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P4: GET all always has data array and count === data.length", async () => {
    // Feature: node-express-mongodb-api, Property 4: collection_response_shape_and_count_consistency
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            dayOfMonth: fc.integer({ min: 1, max: 31 }),
            amount: fc.double({ min: 0.01, max: 100000, noNaN: true }),
            source: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
            isPaycheck: fc.boolean(),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (incomes) => {
          await clearDb();
          for (const inc of incomes) {
            await request(app).post("/api/incomes").set(auth()).send({ ...inc, inactive: false });
          }
          const res = await request(app).get("/api/incomes").set(auth());
          expect(res.status).toBe(200);
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.count).toBe(res.body.data.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  it("P5: POST response contains all submitted fields with original values", async () => {
    // Feature: node-express-mongodb-api, Property 5: create_round_trip_preserves_submitted_fields
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 31 }),
        fc.double({ min: 0.01, max: 100000, noNaN: true }),
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        fc.boolean(),
        async (dayOfMonth, amount, source, isPaycheck) => {
          await clearDb();
          const res = await request(app)
            .post("/api/incomes")
            .set(auth())
            .send({ dayOfMonth, amount, source, isPaycheck, inactive: false });
          expect(res.status).toBe(201);
          expect(res.body.data.dayOfMonth).toBe(dayOfMonth);
          expect(res.body.data.amount).toBe(amount);
          expect(res.body.data.source).toBe(source);
          expect(res.body.data.isPaycheck).toBe(isPaycheck);
          expect(res.body.data.inactive).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });
});

// ─── Period ───────────────────────────────────────────────────────────────────

describe("Period", () => {
  it("P2: POST always returns _id, createdAt, updatedAt", async () => {
    // Feature: node-express-mongodb-api, Property 2: created_documents_include_base_fields
    await fc.assert(
      fc.asyncProperty(periodDatesArb, async ({ startDate, endDate }) => {
        await clearDb();
        const res = await request(app).post("/api/periods").set(auth()).send({ startDate, endDate });
        expect(res.status).toBe(201);
        expect(res.body.data._id).toBeTruthy();
        expect(res.body.data.createdAt).toBeTruthy();
        expect(res.body.data.updatedAt).toBeTruthy();
      }),
      { numRuns: 10 }
    );
  });

  it("P3: POST, GET by id, PUT responses always have a data field", async () => {
    // Feature: node-express-mongodb-api, Property 3: single_resource_response_shape
    await fc.assert(
      fc.asyncProperty(periodDatesArb, periodDatesArb, async (dates1, dates2) => {
        await clearDb();
        const postRes = await request(app).post("/api/periods").set(auth()).send(dates1);
        expect(postRes.status).toBe(201);
        expect(postRes.body).toHaveProperty("data");

        const id = postRes.body.data._id;
        const getRes = await request(app).get(`/api/periods/${id}`).set(auth());
        expect(getRes.status).toBe(200);
        expect(getRes.body).toHaveProperty("data");

        const putRes = await request(app).put(`/api/periods/${id}`).set(auth()).send(dates2);
        expect(putRes.status).toBe(200);
        expect(putRes.body).toHaveProperty("data");
      }),
      { numRuns: 10 }
    );
  });

  it("P4: GET all always has data array and count === data.length", async () => {
    // Feature: node-express-mongodb-api, Property 4: collection_response_shape_and_count_consistency
    await fc.assert(
      fc.asyncProperty(fc.array(periodDatesArb, { minLength: 1, maxLength: 5 }), async (periods) => {
        await clearDb();
        for (const p of periods) {
          await request(app).post("/api/periods").set(auth()).send(p);
        }
        const res = await request(app).get("/api/periods").set(auth());
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.count).toBe(res.body.data.length);
      }),
      { numRuns: 10 }
    );
  });

  it("P5: POST response contains all submitted fields with original values", async () => {
    // Feature: node-express-mongodb-api, Property 5: create_round_trip_preserves_submitted_fields
    await fc.assert(
      fc.asyncProperty(periodDatesArb, async ({ startDate, endDate }) => {
        await clearDb();
        const res = await request(app).post("/api/periods").set(auth()).send({ startDate, endDate });
        expect(res.status).toBe(201);
        expect(res.body.data.startDate).toBe(startDate);
        expect(res.body.data.endDate).toBe(endDate);
      }),
      { numRuns: 10 }
    );
  });

  it("P21: rejects endDate <= startDate", async () => {
    // Feature: node-express-mongodb-api, Property 21: endDate must be after startDate
    await clearDb();
    const sameDate = await request(app)
      .post("/api/periods")
      .set(auth())
      .send({ startDate: "2025-06-15", endDate: "2025-06-15" });
    expect(sameDate.status).toBe(400);

    const beforeDate = await request(app)
      .post("/api/periods")
      .set(auth())
      .send({ startDate: "2025-06-15", endDate: "2025-06-14" });
    expect(beforeDate.status).toBe(400);
  });

  it("P22: generate rejects count outside [1, 12]", async () => {
    // Feature: node-express-mongodb-api, Property 22: generate rejects count outside [1, 12]
    await clearDb();
    const res0 = await request(app).post("/api/periods/generate/0").set(auth());
    expect(res0.status).toBe(400);
    const res13 = await request(app).post("/api/periods/generate/13").set(auth());
    expect(res13.status).toBe(400);
  });

  it("P22: generate returns 422 when no active paycheck incomes exist", async () => {
    await clearDb();
    const res = await request(app).post("/api/periods/generate/1").set(auth());
    expect(res.status).toBe(422);
  });

  it("P23: generated periods have contiguous non-overlapping date ranges", async () => {
    // Feature: node-express-mongodb-api, Property 23: generated periods are contiguous
    await clearDb();
    // Create two active paycheck incomes on days 1 and 15
    await request(app).post("/api/incomes").set(auth()).send({
      dayOfMonth: 1, amount: 1000, source: "Paycheck A", isPaycheck: true, inactive: false,
    });
    await request(app).post("/api/incomes").set(auth()).send({
      dayOfMonth: 15, amount: 1000, source: "Paycheck B", isPaycheck: true, inactive: false,
    });

    const res = await request(app).post("/api/periods/generate/4").set(auth());
    expect(res.status).toBe(200);
    const periods: Array<{ startDate: string; endDate: string }> = res.body.data;
    expect(periods.length).toBe(4);

    for (let i = 0; i < periods.length - 1; i++) {
      const endDate = new Date(periods[i].endDate + "T00:00:00");
      const nextStart = new Date(periods[i + 1].startDate + "T00:00:00");
      const dayAfterEnd = new Date(endDate);
      dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
      expect(dayAfterEnd.toISOString().slice(0, 10)).toBe(periods[i + 1].startDate);
    }
  });

  it("generated periods include populated expense and income subdocuments", async () => {
    await clearDb();
    const catId = await createExpenseCategory();
    const psId = await createPaymentSource();
    // Active paycheck income on day 1
    await request(app).post("/api/incomes").set(auth()).send({
      dayOfMonth: 1, amount: 1000, source: "Paycheck", isPaycheck: true, inactive: false,
    });
    // Active expense on day 5
    await request(app).post("/api/expenses").set(auth()).send({
      dayOfMonth: 5, amount: 200, type: "expense", payee: "Landlord",
      required: true, category: catId, paymentSource: psId, inactive: false,
    });

    const res = await request(app).post("/api/periods/generate/1").set(auth());
    expect(res.status).toBe(200);
    const period = res.body.data[0];
    // incomes subdocuments should be populated objects, not just ObjectIds
    if (period.incomes.length > 0) {
      expect(typeof period.incomes[0].income).toBe("object");
      expect(period.incomes[0].income).toHaveProperty("dayOfMonth");
    }
    if (period.expenses.length > 0) {
      expect(typeof period.expenses[0].expense).toBe("object");
      expect(period.expenses[0].expense).toHaveProperty("payee");
    }
  });
});
