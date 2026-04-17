import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";

// Provide required env vars before importing db/env modules
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.PORT = "3000";
process.env.JWT_SECRET = "testsecret";

import { connectDB } from "../db";

describe("db.ts - connectDB", () => {
  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs success message when mongoose.connect resolves", async () => {
    vi.spyOn(mongoose, "connect").mockResolvedValueOnce(mongoose as never);

    await connectDB();

    expect(console.log).toHaveBeenCalledWith("MongoDB connected successfully");
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("logs error and calls process.exit(1) when mongoose.connect rejects", async () => {
    const err = new Error("connection failed");
    vi.spyOn(mongoose, "connect").mockRejectedValueOnce(err);

    await connectDB();

    expect(console.error).toHaveBeenCalledWith("MongoDB connection error:", err);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
