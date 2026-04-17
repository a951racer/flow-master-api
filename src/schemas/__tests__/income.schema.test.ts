import * as fc from "fast-check";
import { incomeSchema } from "../../schemas/income.schema";

const validIncomeBase = {
  dayOfMonth: 15,
  amount: 1000,
  source: "Salary",
  isPaycheck: true,
  inactive: false,
};

// Feature: node-express-mongodb-api, Property 1: Base fields stripped
describe("Property 1: Base fields stripped", () => {
  it("rejects payloads with _id, createdAt, or updatedAt fields", () => {
    // Validates: Requirements 1.1
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

          const payload: Record<string, unknown> = { ...validIncomeBase };
          if (extras._id !== undefined) payload._id = extras._id;
          if (extras.createdAt !== undefined) payload.createdAt = extras.createdAt;
          if (extras.updatedAt !== undefined) payload.updatedAt = extras.updatedAt;

          const result = incomeSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 8: dayOfMonth validated as integer in [1, 31]
describe("Property 8: dayOfMonth validated as integer in [1, 31]", () => {
  it("rejects out-of-range integers for dayOfMonth", () => {
    // Validates: Requirements 1.8
    fc.assert(
      fc.property(
        fc.integer().filter((n) => n < 1 || n > 31),
        (dayOfMonth) => {
          const result = incomeSchema.safeParse({ ...validIncomeBase, dayOfMonth });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects non-integer floats for dayOfMonth", () => {
    // Validates: Requirements 1.8
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 31 }).filter((n) => !Number.isInteger(n)),
        (dayOfMonth) => {
          const result = incomeSchema.safeParse({ ...validIncomeBase, dayOfMonth });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 9: amount must be positive
describe("Property 9: amount must be positive", () => {
  it("rejects non-positive amounts", () => {
    // Validates: Requirements 1.9
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(0), fc.integer({ max: -1 }).map((n) => n)),
        (amount) => {
          const result = incomeSchema.safeParse({ ...validIncomeBase, amount });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 10: inactiveDate only valid when inactive is true
describe("Property 10: inactiveDate only valid when inactive is true", () => {
  it("rejects inactiveDate when inactive is false", () => {
    // Validates: Requirements 1.10
    fc.assert(
      fc.property(fc.constant("2024-01-15"), (inactiveDate) => {
        const result = incomeSchema.safeParse({
          ...validIncomeBase,
          inactive: false,
          inactiveDate,
        });
        return result.success === false;
      }),
      { numRuns: 100 }
    );
  });
});
