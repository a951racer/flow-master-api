// Feature: node-express-mongodb-api, Property 20: startDate must be a valid ISO 8601 date
// Feature: node-express-mongodb-api, Property 21: endDate must be after startDate
import * as fc from "fast-check";
import { periodSchema } from "../../schemas/period.schema";

const validDate = "2025-06-15";

describe("periodSchema - Property 20: startDate must be a valid ISO 8601 date", () => {
  it("should reject any string that does not match YYYY-MM-DD format", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (invalidDate) => {
          const result = periodSchema.safeParse({ startDate: invalidDate, endDate: validDate });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("periodSchema - Property 21: endDate must be after startDate", () => {
  it("should reject payloads where endDate is not strictly after startDate", () => {
    // endDate equal to startDate
    expect(periodSchema.safeParse({ startDate: "2025-06-15", endDate: "2025-06-15" }).success).toBe(false);
    // endDate before startDate
    expect(periodSchema.safeParse({ startDate: "2025-06-15", endDate: "2025-06-14" }).success).toBe(false);
  });

  it("should accept payloads where endDate is strictly after startDate", () => {
    expect(periodSchema.safeParse({ startDate: "2025-06-01", endDate: "2025-06-14" }).success).toBe(true);
  });

  it("should reject any pair where endDate <= startDate", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 2000, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 })
        ).map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`),
        (date) => {
          // endDate === startDate should fail
          const result = periodSchema.safeParse({ startDate: date, endDate: date });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
