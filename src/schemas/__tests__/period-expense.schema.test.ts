import * as fc from "fast-check";
import { periodExpenseSchema } from "../../schemas/period-expense.schema";
import { periodExpenseEntrySchema } from "../../schemas/period.schema";

const validObjectId = "a".repeat(24);
const validPeriodExpenseBase = {
  period: validObjectId,
  expense: validObjectId,
  status: "Unpaid" as const,
};

// Feature: node-express-mongodb-api, Property 1: Base fields stripped
describe("periodExpenseSchema - Property 1: Base fields stripped", () => {
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

          if (!hasExtra) return true; // skip if no extra fields added

          const payload: Record<string, unknown> = { ...validPeriodExpenseBase };
          if (extras._id !== undefined) payload._id = extras._id;
          if (extras.createdAt !== undefined) payload.createdAt = extras.createdAt;
          if (extras.updatedAt !== undefined) payload.updatedAt = extras.updatedAt;

          const result = periodExpenseSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 9: amount must be positive
describe("periodExpenseSchema - Property 9: overrideAmount must be positive when present", () => {
  it("rejects non-positive overrideAmount values", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(0), fc.integer({ max: -1 }).map((n) => n)),
        (overrideAmount) => {
          const payload = { ...validPeriodExpenseBase, overrideAmount };
          const result = periodExpenseSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property: isCarryOver must be boolean when present
describe("periodExpenseEntrySchema - isCarryOver field", () => {
  const validBase = {
    expense: "a".repeat(24),
    status: "Unpaid" as const,
  };

  it("accepts a valid entry without isCarryOver", () => {
    expect(periodExpenseEntrySchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts isCarryOver: true", () => {
    expect(periodExpenseEntrySchema.safeParse({ ...validBase, isCarryOver: true }).success).toBe(true);
  });

  it("accepts isCarryOver: false", () => {
    expect(periodExpenseEntrySchema.safeParse({ ...validBase, isCarryOver: false }).success).toBe(true);
  });

  it("rejects non-boolean isCarryOver values", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
        (val) => {
          const result = periodExpenseEntrySchema.safeParse({ ...validBase, isCarryOver: val });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
