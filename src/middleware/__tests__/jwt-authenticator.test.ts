import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Mock config and token service with a known secret
vi.mock("../../config/env", () => ({
  config: {
    jwtSecret: "test-secret-key",
    jwtExpiresIn: "1h",
  },
}));

import { jwtAuthenticator } from "../jwt-authenticator";

const TEST_SECRET = "test-secret-key";

function makeMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
}

function makeMockReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

describe("jwtAuthenticator", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = makeMockReq({});
    const { res, status } = makeMockRes();
    const next = vi.fn();

    jwtAuthenticator(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header does not use Bearer scheme", () => {
    const req = makeMockReq({ authorization: "Basic sometoken" });
    const { res, status } = makeMockRes();
    const next = vi.fn();

    jwtAuthenticator(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", () => {
    const req = makeMockReq({ authorization: "Bearer not.a.valid.token" });
    const { res, status } = makeMockRes();
    const next = vi.fn();

    jwtAuthenticator(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired", () => {
    const expiredToken = jwt.sign({ userId: "abc" }, TEST_SECRET, { expiresIn: -1 });
    const req = makeMockReq({ authorization: `Bearer ${expiredToken}` });
    const { res, status } = makeMockRes();
    const next = vi.fn();

    jwtAuthenticator(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches decoded payload to req.user and calls next() for a valid token", () => {
    const payload = { userId: "user123", role: "admin" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const req = makeMockReq({ authorization: `Bearer ${token}` });
    const { res } = makeMockRes();
    const next = vi.fn();

    jwtAuthenticator(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeDefined();
    expect((req as any).user.userId).toBe(payload.userId);
    expect((req as any).user.role).toBe(payload.role);
  });
});
