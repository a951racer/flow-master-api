import * as fc from "fast-check";
import { registerSchema, loginSchema } from "../../schemas/user.schema";

// Feature: node-express-mongodb-api, Property 1: Base fields stripped
describe("Property 1: Base fields stripped", () => {
  it("registerSchema rejects payloads containing _id, createdAt, or updatedAt", () => {
    const validBase = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
    };

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

          const payload: Record<string, unknown> = { ...validBase };
          if (extras._id !== undefined) payload._id = extras._id;
          if (extras.createdAt !== undefined) payload.createdAt = extras.createdAt;
          if (extras.updatedAt !== undefined) payload.updatedAt = extras.updatedAt;

          const result = registerSchema.safeParse(payload);
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 11: Email validation rejects malformed addresses
describe("Property 11: Email validation rejects malformed addresses", () => {
  it("registerSchema rejects strings without '@'", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("@")),
        (invalidEmail) => {
          const result = registerSchema.safeParse({
            firstName: "John",
            lastName: "Doe",
            email: invalidEmail,
            password: "password123",
          });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("loginSchema rejects strings without '@'", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes("@")),
        (invalidEmail) => {
          const result = loginSchema.safeParse({
            email: invalidEmail,
            password: "password123",
          });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 12: Password minimum length enforced
describe("Property 12: Password minimum length enforced", () => {
  it("registerSchema rejects passwords shorter than 8 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          const result = registerSchema.safeParse({
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            password: shortPassword,
          });
          return result.success === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
