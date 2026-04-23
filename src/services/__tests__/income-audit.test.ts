import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../app";

let mongod: MongoMemoryServer;
let authToken: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  for (const key in mongoose.connection.collections) {
    await mongoose.connection.collections[key].deleteMany({});
  }
  const res = await request(app).post("/api/auth/register").send({
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    password: "password123",
  });
  authToken = res.body.data.token;
});

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

const baseIncome = {
  dayOfMonth: 15,
  amount: 2000,
  source: "Employer",
  isPaycheck: true,
  inactive: false,
};

describe("Income Audit Trail", () => {
  it("creates an audit entry with action=created when an income is created", async () => {
    const createRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    expect(createRes.status).toBe(201);
    const id = createRes.body.data._id;

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);

    const entry = auditRes.body.data[0];
    expect(entry.action).toBe("created");
    expect(entry.incomeId).toBe(id);
    expect(entry.changedAt).toBeTruthy();
    expect(Array.isArray(entry.changes)).toBe(true);
    expect(entry.changes.length).toBeGreaterThan(0);

    const amountChange = entry.changes.find((c: { field: string }) => c.field === "amount");
    expect(amountChange).toBeDefined();
    expect(amountChange.previousValue).toBeNull();
    expect(amountChange.newValue).toBe(2000);
  });

  it("creates an audit entry with action=updated and only changed fields", async () => {
    const createRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const id = createRes.body.data._id;

    await request(app)
      .put(`/api/incomes/${id}`)
      .set(auth())
      .send({ ...baseIncome, amount: 2500 });

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(2);

    const updateEntry = auditRes.body.data[1];
    expect(updateEntry.action).toBe("updated");
    expect(updateEntry.changes).toHaveLength(1);
    expect(updateEntry.changes[0].field).toBe("amount");
    expect(updateEntry.changes[0].previousValue).toBe(2000);
    expect(updateEntry.changes[0].newValue).toBe(2500);
  });

  it("does NOT create an audit entry when an update results in no changes", async () => {
    const createRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const id = createRes.body.data._id;

    // Update with identical data
    await request(app).put(`/api/incomes/${id}`).set(auth()).send(baseIncome);

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    // Only the "created" entry should exist
    expect(auditRes.body.data).toHaveLength(1);
  });

  it("creates an audit entry with action=deleted when an income is deleted", async () => {
    const createRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const id = createRes.body.data._id;

    await request(app).delete(`/api/incomes/${id}`).set(auth());

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(2);

    const deleteEntry = auditRes.body.data[1];
    expect(deleteEntry.action).toBe("deleted");
    expect(deleteEntry.changes.length).toBeGreaterThan(0);
    const amountChange = deleteEntry.changes.find((c: { field: string }) => c.field === "amount");
    expect(amountChange.previousValue).toBe(2000);
    expect(amountChange.newValue).toBeNull();
  });

  it("audit entries are ordered by changedAt ascending", async () => {
    const createRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const id = createRes.body.data._id;

    await request(app).put(`/api/incomes/${id}`).set(auth()).send({ ...baseIncome, amount: 3000 });
    await request(app).put(`/api/incomes/${id}`).set(auth()).send({ ...baseIncome, amount: 3500 });

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    const entries = auditRes.body.data;
    expect(entries.length).toBe(3);
    expect(entries[0].action).toBe("created");
    for (let i = 1; i < entries.length; i++) {
      expect(new Date(entries[i].changedAt) >= new Date(entries[i - 1].changedAt)).toBe(true);
    }
  });

  it("GET /api/incomes/:id/audit returns 400 for invalid ObjectId", async () => {
    const res = await request(app).get("/api/incomes/not-an-id/audit").set(auth());
    expect(res.status).toBe(400);
  });

  it("GET /api/incomes/:id/audit returns empty array for income with no audit entries", async () => {
    // Directly insert an income bypassing the service to have no audit entries
    const { Income } = await import("../../models/income.model");
    const income = await Income.create(baseIncome);
    const id = String(income._id);

    const auditRes = await request(app).get(`/api/incomes/${id}/audit`).set(auth());
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(0);
  });
});

describe("Income Cascade to Active Periods", () => {
  it("removes income from active periods when income is deactivated", async () => {
    // Create an income
    const incomeRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const incomeId = incomeRes.body.data._id;

    // Create a period with this income (manually for test)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const periodRes = await request(app)
      .post("/api/periods")
      .set(auth())
      .send({
        startDate: tomorrow.toISOString().split("T")[0],
        endDate: nextWeek.toISOString().split("T")[0],
        incomes: [{ income: incomeId, status: "Pending" }],
        expenses: [],
      });
    expect(periodRes.status).toBe(201);
    const periodId = periodRes.body.data._id;

    // Verify income is in the period
    let periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(1);

    // Deactivate the income
    await request(app)
      .put(`/api/incomes/${incomeId}`)
      .set(auth())
      .send({ ...baseIncome, inactive: true, inactiveDate: "2026-04-22" });

    // Verify income was removed from the period
    periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(0);
  });

  it("does NOT remove income from past periods when income is deactivated", async () => {
    // Create an income
    const incomeRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const incomeId = incomeRes.body.data._id;

    // Create a past period (endDate before today)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const periodRes = await request(app)
      .post("/api/periods")
      .set(auth())
      .send({
        startDate: lastWeek.toISOString().split("T")[0],
        endDate: yesterday.toISOString().split("T")[0],
        incomes: [{ income: incomeId, status: "Received" }],
        expenses: [],
      });
    expect(periodRes.status).toBe(201);
    const periodId = periodRes.body.data._id;

    // Deactivate the income
    await request(app)
      .put(`/api/incomes/${incomeId}`)
      .set(auth())
      .send({ ...baseIncome, inactive: true, inactiveDate: "2026-04-22" });

    // Verify income is still in the past period
    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(1);
  });

  it("does NOT cascade when income was already inactive", async () => {
    // Create an inactive income
    const incomeRes = await request(app)
      .post("/api/incomes")
      .set(auth())
      .send({ ...baseIncome, inactive: true, inactiveDate: "2026-04-20" });
    const incomeId = incomeRes.body.data._id;

    // Create an active period with this income (edge case)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const periodRes = await request(app)
      .post("/api/periods")
      .set(auth())
      .send({
        startDate: tomorrow.toISOString().split("T")[0],
        endDate: nextWeek.toISOString().split("T")[0],
        incomes: [{ income: incomeId, status: "Pending" }],
        expenses: [],
      });
    const periodId = periodRes.body.data._id;

    // Update the income (but it stays inactive)
    await request(app)
      .put(`/api/incomes/${incomeId}`)
      .set(auth())
      .send({ ...baseIncome, inactive: true, inactiveDate: "2026-04-21", amount: 2500 });

    // Verify income is still in the period (no cascade because it was already inactive)
    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(1);
  });
});

describe("Income activation cascade to active periods", () => {
  // Use a period that spans the entire current month + next month to reliably contain dayOfMonth=15
  function activePeriodSpan() {
    const start = new Date();
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 2);
    end.setDate(0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { startDate: fmt(start), endDate: fmt(end) };
  }

  it("adds income to active periods on create when active", async () => {
    const span = activePeriodSpan();
    const periodRes = await request(app).post("/api/periods").set(auth()).send({
      ...span,
      expenses: [],
      incomes: [],
    });
    expect(periodRes.status).toBe(201);
    const periodId = periodRes.body.data._id;

    const incRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    expect(incRes.status).toBe(201);
    const incId = incRes.body.data._id;

    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    const incomeIds = periodCheck.body.data.incomes.map((e: { income: { _id: string } | string }) =>
      typeof e.income === "object" ? e.income._id : e.income
    );
    expect(incomeIds).toContain(incId);
  });

  it("does NOT add income to active periods on create when inactive", async () => {
    const span = activePeriodSpan();
    const periodRes = await request(app).post("/api/periods").set(auth()).send({
      ...span,
      expenses: [],
      incomes: [],
    });
    const periodId = periodRes.body.data._id;

    await request(app).post("/api/incomes").set(auth()).send({
      ...baseIncome,
      inactive: true,
      inactiveDate: new Date().toISOString().slice(0, 10),
    });

    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(0);
  });

  it("adds income to active periods when reactivated", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const incRes = await request(app).post("/api/incomes").set(auth()).send({
      ...baseIncome,
      inactive: true,
      inactiveDate: today,
    });
    const incId = incRes.body.data._id;

    const span = activePeriodSpan();
    const periodRes = await request(app).post("/api/periods").set(auth()).send({
      ...span,
      expenses: [],
      incomes: [],
    });
    const periodId = periodRes.body.data._id;

    await request(app).put(`/api/incomes/${incId}`).set(auth()).send({ ...baseIncome, inactive: false });

    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    const incomeIds = periodCheck.body.data.incomes.map((e: { income: { _id: string } | string }) =>
      typeof e.income === "object" ? e.income._id : e.income
    );
    expect(incomeIds).toContain(incId);
  });

  it("does NOT add a duplicate entry if income is already in the period", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const incRes = await request(app).post("/api/incomes").set(auth()).send(baseIncome);
    const incId = incRes.body.data._id;

    const span = activePeriodSpan();
    const periodRes = await request(app).post("/api/periods").set(auth()).send({
      ...span,
      expenses: [],
      incomes: [{ income: incId, status: "Pending" }],
    });
    const periodId = periodRes.body.data._id;

    // Deactivate then reactivate — should not duplicate
    await request(app).put(`/api/incomes/${incId}`).set(auth()).send({ ...baseIncome, inactive: true, inactiveDate: today });
    await request(app).put(`/api/incomes/${incId}`).set(auth()).send({ ...baseIncome, inactive: false });

    const periodCheck = await request(app).get(`/api/periods/${periodId}`).set(auth());
    expect(periodCheck.body.data.incomes).toHaveLength(1);
  });
});
