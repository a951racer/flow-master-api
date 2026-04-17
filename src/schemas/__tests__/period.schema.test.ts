// Feature: node-express-mongodb-api, Property 20: startDate must be a valid ISO 8601 date
import * as fc from "fast-check";
import { periodSchema } from "../../schemas/period.schema";

/**
 * Validates: Requirements 1.2
 */
describe("periodSchema - Property 20: startDate must be a valid ISO 8601 date", () => {
  it("should reject any string that does not match YYYY-MM-DD format", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (invalidDate) => {
          const result = periodSchema.safeParse({ startDate: invalidDate });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
