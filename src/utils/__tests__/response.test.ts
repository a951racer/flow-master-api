import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { sendData, sendCollection, sendError } from "../response";
import { Response } from "express";

function makeMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
}

// Feature: node-express-mongodb-api, Property 3: Single-resource response shape
// Validates: Requirements 13.2
describe("Property 3: sendData response shape", () => {
  it("always wraps data in a { data } field for any value", () => {
    fc.assert(
      fc.property(fc.anything(), fc.integer({ min: 200, max: 599 }), (data, statusCode) => {
        const { res, status, json } = makeMockRes();
        sendData(res, statusCode, data);
        expect(status).toHaveBeenCalledWith(statusCode);
        const body = json.mock.calls[0][0];
        expect(body).toHaveProperty("data");
        expect(body.data).toStrictEqual(data);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: node-express-mongodb-api, Property 4: Collection response shape and count consistency
// Validates: Requirements 13.3
describe("Property 4: sendCollection response shape and count consistency", () => {
  it("always returns { data, count } where count === data.length for any array", () => {
    fc.assert(
      fc.property(fc.array(fc.anything()), (data) => {
        const { res, status, json } = makeMockRes();
        sendCollection(res, data);
        expect(status).toHaveBeenCalledWith(200);
        const body = json.mock.calls[0][0];
        expect(body).toHaveProperty("data");
        expect(body).toHaveProperty("count");
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.count).toBe(data.length);
      }),
      { numRuns: 100 }
    );
  });
});

describe("sendError response shape", () => {
  it("returns { status, message } for any status code and message", () => {
    const { res, status, json } = makeMockRes();
    sendError(res, 404, "Not found");
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ status: 404, message: "Not found" });
  });
});
