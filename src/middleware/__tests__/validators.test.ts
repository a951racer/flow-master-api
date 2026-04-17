import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { validateBody } from "../validate-body";
import { validateObjectId } from "../validate-object-id";

function makeMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
}

function makeMockReq(body: unknown = {}, params: Record<string, string> = {}): Request {
  return { body, params } as unknown as Request;
}

const mockNext: NextFunction = vi.fn();

// Feature: node-express-mongodb-api, Property 6: Strict mode rejects unknown fields
// Validates: Requirements 10.4
describe("Property 6: validateBody strict mode rejects unknown fields", () => {
  it("returns 400 for any payload with an extra unknown field", () => {
    // Use a simple strict schema with a known field
    const schema = z.object({ name: z.string() }).strict();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),   // valid name value
        fc.string({ minLength: 1 }).filter((s) => s !== "name"), // unknown field key
        fc.anything(),                  // unknown field value
        (name, unknownKey, unknownValue) => {
          const body = { name, [unknownKey]: unknownValue };
          const req = makeMockReq(body);
          const { res, status } = makeMockRes();
          const next = vi.fn();

          validateBody(schema)(req, res, next);

          expect(status).toHaveBeenCalledWith(400);
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 7: Invalid ObjectId format returns 400
// Validates: Requirements 10.3
describe("Property 7: validateObjectId returns 400 for non-24-char-hex strings", () => {
  it("returns 400 for any string that is not a valid 24-char hex ObjectId", () => {
    const validObjectIdRegex = /^[a-f\d]{24}$/i;

    fc.assert(
      fc.property(
        fc.string().filter((s) => !validObjectIdRegex.test(s)),
        (invalidId) => {
          const req = makeMockReq({}, { id: invalidId });
          const { res, status } = makeMockRes();
          const next = vi.fn();

          validateObjectId("id")(req, res, next);

          expect(status).toHaveBeenCalledWith(400);
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("calls next() for a valid 24-char hex ObjectId", () => {
    const validId = "a".repeat(24);
    const req = makeMockReq({}, { id: validId });
    const { res } = makeMockRes();
    const next = vi.fn();

    validateObjectId("id")(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
