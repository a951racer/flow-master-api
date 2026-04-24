/**
 * Unit tests for the dayFallsInPeriod logic used by
 * addExpenseToActivePeriods / addIncomeToActivePeriods.
 *
 * dayFallsInPeriod is not exported, so we test it indirectly via
 * addExpenseToActivePeriods against an in-memory MongoDB.
 *
 * Feature: node-express-mongodb-api
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Period } from "../../models/period.model";
import {
  addExpenseToActivePeriods,
  addIncomeToActivePeriods,
} from "../period.repository";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Period.deleteMany({});
});

/** Create a fake ObjectId string */
function fakeId(): string {
  return new mongoose.Types.ObjectId().toString();
}

/** Create a period document directly in the DB */
async function createPeriod(startDate: string, endDate: string) {
  return Period.create({ startDate, endDate, expenses: [], incomes: [] });
}

// ---------------------------------------------------------------------------
// addExpenseToActivePeriods — dayFallsInPeriod coverage
// ---------------------------------------------------------------------------

describe("addExpenseToActivePeriods — dayFallsInPeriod", () => {
  it("adds expense when dayOfMonth falls exactly on startDate", async () => {
    const expId = fakeId();
    // Period: 2026-05-10 to 2026-05-20, dayOfMonth=10 → candidate 2026-05-10 == startDate
    const period = await createPeriod("2026-05-10", "2026-05-20");

    await addExpenseToActivePeriods(expId, 10);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(true);
  });

  it("adds expense when dayOfMonth falls exactly on endDate", async () => {
    const expId = fakeId();
    // Period: 2026-05-10 to 2026-05-20, dayOfMonth=20 → candidate 2026-05-20 == endDate
    const period = await createPeriod("2026-05-10", "2026-05-20");

    await addExpenseToActivePeriods(expId, 20);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(true);
  });

  it("does NOT add expense when dayOfMonth is outside the period range", async () => {
    const expId = fakeId();
    // Period: 2026-05-10 to 2026-05-20, dayOfMonth=5 → candidate 2026-05-05 < startDate
    const period = await createPeriod("2026-05-10", "2026-05-20");

    await addExpenseToActivePeriods(expId, 5);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(false);
  });

  it("adds expense for a multi-month period where dayOfMonth hits in the second month", async () => {
    const expId = fakeId();
    // Period: 2026-05-20 to 2026-06-10, dayOfMonth=5 → candidate June 5 falls within range
    const period = await createPeriod("2026-05-20", "2026-06-10");

    await addExpenseToActivePeriods(expId, 5);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(true);
  });

  it("clamps dayOfMonth to last day of month (e.g. day 31 in February)", async () => {
    const expId = fakeId();
    // Period: 2026-02-01 to 2026-02-28, dayOfMonth=31 → clamped to Feb 28 → within range
    const period = await createPeriod("2026-02-01", "2026-02-28");

    await addExpenseToActivePeriods(expId, 31);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(true);
  });

  it("clamps dayOfMonth=31 in a 30-day month (April) and matches if within range", async () => {
    const expId = fakeId();
    // Period: 2026-04-01 to 2026-04-30, dayOfMonth=31 → clamped to Apr 30 → within range
    const period = await createPeriod("2026-04-01", "2026-04-30");

    await addExpenseToActivePeriods(expId, 31);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(true);
  });

  it("does NOT add a duplicate if expense is already present", async () => {
    const expId = fakeId();
    const period = await createPeriod("2026-05-01", "2026-05-31");
    // Pre-insert the expense
    await Period.updateOne({ _id: period._id }, { $push: { expenses: { expense: expId, status: "Unpaid" } } });

    await addExpenseToActivePeriods(expId, 15);

    const updated = await Period.findById(period._id);
    const matches = updated!.expenses.filter((e) => String(e.expense) === expId);
    expect(matches).toHaveLength(1);
  });

  it("skips past periods (endDate < today)", async () => {
    const expId = fakeId();
    // Past period — should not be touched
    const period = await createPeriod("2020-01-01", "2020-01-31");

    await addExpenseToActivePeriods(expId, 15);

    const updated = await Period.findById(period._id);
    expect(updated!.expenses.some((e) => String(e.expense) === expId)).toBe(false);
  });

  it("adds expense with status Unpaid", async () => {
    const expId = fakeId();
    const period = await createPeriod("2026-05-01", "2026-05-31");

    await addExpenseToActivePeriods(expId, 15);

    const updated = await Period.findById(period._id);
    const entry = updated!.expenses.find((e) => String(e.expense) === expId);
    expect(entry?.status).toBe("Unpaid");
  });
});

// ---------------------------------------------------------------------------
// addIncomeToActivePeriods — mirrors expense tests
// ---------------------------------------------------------------------------

describe("addIncomeToActivePeriods — dayFallsInPeriod", () => {
  it("adds income when dayOfMonth falls within the period", async () => {
    const incId = fakeId();
    const period = await createPeriod("2026-05-01", "2026-05-31");

    await addIncomeToActivePeriods(incId, 15);

    const updated = await Period.findById(period._id);
    expect(updated!.incomes.some((e) => String(e.income) === incId)).toBe(true);
  });

  it("does NOT add income when dayOfMonth is outside the period range", async () => {
    const incId = fakeId();
    // Period: 2026-05-10 to 2026-05-20, dayOfMonth=5 → outside
    const period = await createPeriod("2026-05-10", "2026-05-20");

    await addIncomeToActivePeriods(incId, 5);

    const updated = await Period.findById(period._id);
    expect(updated!.incomes.some((e) => String(e.income) === incId)).toBe(false);
  });

  it("clamps dayOfMonth=31 in February and adds if within range", async () => {
    const incId = fakeId();
    const period = await createPeriod("2026-02-01", "2026-02-28");

    await addIncomeToActivePeriods(incId, 31);

    const updated = await Period.findById(period._id);
    expect(updated!.incomes.some((e) => String(e.income) === incId)).toBe(true);
  });

  it("does NOT add a duplicate if income is already present", async () => {
    const incId = fakeId();
    const period = await createPeriod("2026-05-01", "2026-05-31");
    await Period.updateOne({ _id: period._id }, { $push: { incomes: { income: incId, isReceived: false } } });

    await addIncomeToActivePeriods(incId, 15);

    const updated = await Period.findById(period._id);
    const matches = updated!.incomes.filter((e) => String(e.income) === incId);
    expect(matches).toHaveLength(1);
  });

  it("skips past periods (endDate < today)", async () => {
    const incId = fakeId();
    const period = await createPeriod("2020-01-01", "2020-01-31");

    await addIncomeToActivePeriods(incId, 15);

    const updated = await Period.findById(period._id);
    expect(updated!.incomes.some((e) => String(e.income) === incId)).toBe(false);
  });

  it("adds income with isReceived false", async () => {
    const incId = fakeId();
    const period = await createPeriod("2026-05-01", "2026-05-31");

    await addIncomeToActivePeriods(incId, 15);

    const updated = await Period.findById(period._id);
    const entry = updated!.incomes.find((e) => String(e.income) === incId);
    expect(entry?.isReceived).toBe(false);
  });
});
