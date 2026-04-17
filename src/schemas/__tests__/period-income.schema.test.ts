import * as fc from "fast-check";
import { periodIncomeSchema } from "../../schemas/period-income.schema";

const validObjectId = "a".repeat(24);
const validPeriodIncomeBase = {
  period: validObjectId,
  income: validObjectId,
  status: "Pending" as const,
};

describe("periodIncomeSchema - valid inputs", () => {
  it("accepts a valid payload without overrideAmount", () => {
    const result = periodIncomeSchema.safeParse(validPeriodIncomeBase);
    expect(result.success).toBe(true);
  });

  it("accepts a valid payload with overrideAmount", () => {
    const result = periodIncomeSchema.safeParse({ ...validPeriodIncomeBase, overrideAmount: 100 });
    expect(result.success).toBe(true);
  });

  it("accepts status Received", () => {
    const result = periodIncomeSchema.safeParse({ ...validPeriodIncomeBase, status: "Received" });
    expect(result.success).toBe(true);
  });
});

describe("periodIncomeSchema - invalid ObjectId", () => {
  it("rejects invalid period ObjectId", () => {
    const result = periodIncomeSchema.safeParse({ ...validPeriodIncomeBase, period: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid income ObjectId", () => {
    const result = periodIncomeSchema.safeParse({ ...validPeriodIncomeBase, income: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("periodIncomeSchema - invalid status", () => {
  it("rejects unknown status values", () => {
    const result = periodIncomeSchema.safeParse({ ...validPeriodIncomeBase, status: "Paid" });
    expect(result.success).toBe(false);
  });
});

// Feature: node-express-mongodb-api, Property 1: Base fields stripped
// Validates: Requirements 21.2–21.4
describe("periodIncomeSchema - Property 1: Base fields stripped", () => {
  it("rejects payloads with _id, createdAt, or updatedAt fields", () => {
    fc.assert(
      fc.property(
        fc.record({
          _id: fc.option(fc.string(), { nil: undefined }),
          createdAt: fc.option(fc.date(), { nil: undefined }),
          updatedAt: fc.option(fc.date(), { nil: undefined }),
        }),
        (extras) => {
          const hasExtra =
            extras._id !== undefined ||
            extras.createdAt !== undefined ||
            extras.updatedAt !== undefined;

          if (!hasExtra) return true;

          const payload: Record<string, unknown> = { ...validPeriodIncomeBase };
          if (extras._id !== undefined) payload._id = extras._id;
          if (extras.createdAt !== undefined) payload.createdAt = extras.createdAt;
          if (extras.updatedAt !== undefined) payload.updatedAt = extras.updatedAt;

          const result = periodIncomeSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 9: amount must be positive
// Validates: Requirements 21.4
describe("periodIncomeSchema - Property 9: overrideAmount must be positive when present", () => {
  it("rejects non-positive overrideAmount values", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(0), fc.integer({ max: -1 }).map((n) => n)),
        (overrideAmount) => {
          const payload = { ...validPeriodIncomeBase, overrideAmount };
          const result = periodIncomeSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
