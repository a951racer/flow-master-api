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
