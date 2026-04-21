import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../app";

let mongod: MongoMemoryServer;
let authToken: string;
let catId: string;
let psId: string;

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
    firstName: "Test", lastName: "User", email: "test@example.com", password: "password123",
  });
  authToken = res.body.data.token;

  const cat = await request(app).post("/api/expense-categories").set(auth()).send({ category: "Utilities" });
  catId = cat.body.data._id;
  const ps = await request(app).post("/api/payment-sources").set(auth()).send({ source: "Checking" });
  psId = ps.body.data._id;
});

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

const baseExpense = () => ({
  dayOfMonth: 10,
  amount: 150,
  type: "expense" as const,
  payee: "Electric Co",
  required: true,
  category: catId,
  paymentSource: psId,
  inactive: false,
});

describe("Expense Audit Trail", () => {
  it("creates an audit entry with action=created when an expense is created", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    expect(createRes.status).toBe(201);
    const id = createRes.body.data._id;

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data).toHaveLength(1);

    const entry = auditRes.body.data[0];
    expect(entry.action).toBe("created");
    expect(entry.expenseId).toBe(id);
    expect(entry.changedAt).toBeTruthy();
    expect(Array.isArray(entry.changes)).toBe(true);

    const amountChange = entry.changes.find((c: { field: string }) => c.field === "amount");
    expect(amountChange).toBeDefined();
    expect(amountChange.previousValue).toBeNull();
    expect(amountChange.newValue).toBe(150);
  });

  it("creates an audit entry with action=updated and only changed fields", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    await request(app).put(`/api/expenses/${id}`).set(auth()).send({ ...baseExpense(), amount: 200 });

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    expect(auditRes.body.data).toHaveLength(2);

    const updateEntry = auditRes.body.data[1];
    expect(updateEntry.action).toBe("updated");
    expect(updateEntry.changes).toHaveLength(1);
    expect(updateEntry.changes[0].field).toBe("amount");
    expect(updateEntry.changes[0].previousValue).toBe(150);
    expect(updateEntry.changes[0].newValue).toBe(200);
  });

  it("does NOT create an audit entry when an update results in no changes", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    await request(app).put(`/api/expenses/${id}`).set(auth()).send(baseExpense());

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    expect(auditRes.body.data).toHaveLength(1);
  });

  it("creates an audit entry with action=deleted when an expense is deleted", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    await request(app).delete(`/api/expenses/${id}`).set(auth());

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    expect(auditRes.body.data).toHaveLength(2);

    const deleteEntry = auditRes.body.data[1];
    expect(deleteEntry.action).toBe("deleted");
    const amountChange = deleteEntry.changes.find((c: { field: string }) => c.field === "amount");
    expect(amountChange.previousValue).toBe(150);
    expect(amountChange.newValue).toBeNull();
  });

  it("audit entries are ordered by changedAt ascending", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    await request(app).put(`/api/expenses/${id}`).set(auth()).send({ ...baseExpense(), amount: 200 });
    await request(app).put(`/api/expenses/${id}`).set(auth()).send({ ...baseExpense(), amount: 250 });

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    const entries = auditRes.body.data;
    expect(entries.length).toBe(3);
    expect(entries[0].action).toBe("created");
    for (let i = 1; i < entries.length; i++) {
      expect(new Date(entries[i].changedAt) >= new Date(entries[i - 1].changedAt)).toBe(true);
    }
  });

  it("GET /api/expenses/:id/audit returns 400 for invalid ObjectId", async () => {
    const res = await request(app).get("/api/expenses/not-an-id/audit").set(auth());
    expect(res.status).toBe(400);
  });

  it("records category and paymentSource as string ObjectIds in the deleted audit entry", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    await request(app).delete(`/api/expenses/${id}`).set(auth());

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    const deleteEntry = auditRes.body.data[1];
    expect(deleteEntry.action).toBe("deleted");

    const catChange = deleteEntry.changes.find((c: { field: string }) => c.field === "category");
    expect(catChange).toBeDefined();
    expect(typeof catChange.previousValue).toBe("string");
    expect(catChange.newValue).toBeNull();

    const psChange = deleteEntry.changes.find((c: { field: string }) => c.field === "paymentSource");
    expect(psChange).toBeDefined();
    expect(typeof psChange.previousValue).toBe("string");
    expect(psChange.newValue).toBeNull();
  });

  it("records category and paymentSource changes as string ObjectIds", async () => {
    const createRes = await request(app).post("/api/expenses").set(auth()).send(baseExpense());
    const id = createRes.body.data._id;

    const newCat = await request(app).post("/api/expense-categories").set(auth()).send({ category: "Food" });
    const newCatId = newCat.body.data._id;

    await request(app).put(`/api/expenses/${id}`).set(auth()).send({ ...baseExpense(), category: newCatId });

    const auditRes = await request(app).get(`/api/expenses/${id}/audit`).set(auth());
    const updateEntry = auditRes.body.data[1];
    const catChange = updateEntry.changes.find((c: { field: string }) => c.field === "category");
    expect(catChange).toBeDefined();
    expect(typeof catChange.previousValue).toBe("string");
    expect(typeof catChange.newValue).toBe("string");
    expect(catChange.newValue).toBe(newCatId);
  });
});
