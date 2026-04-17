import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

// Override config before importing token service
vi.mock("../../config/env", () => ({
  config: {
    jwtSecret: "test-secret-key",
    jwtExpiresIn: "1h",
  },
}));

import { signToken, verifyToken } from "../token.service";

describe("token.service", () => {
  describe("signToken + verifyToken round-trip", () => {
    it("signs a payload and verifies it back correctly", () => {
      const payload = { userId: "abc123", role: "user" };
      const token = signToken(payload);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe("verifyToken with expired token", () => {
    it("throws when the token is expired", () => {
      // Sign with -1s expiry so it's immediately expired
      const expiredToken = jwt.sign({ userId: "xyz" }, "test-secret-key", { expiresIn: -1 });
      expect(() => verifyToken(expiredToken)).toThrow();
    });
  });

  describe("verifyToken with tampered token", () => {
    it("throws when the token signature is tampered", () => {
      const token = signToken({ userId: "abc" });
      // Tamper the signature (last segment)
      const parts = token.split(".");
      parts[2] = parts[2].split("").reverse().join("");
      const tampered = parts.join(".");
      expect(() => verifyToken(tampered)).toThrow();
    });
  });
});
