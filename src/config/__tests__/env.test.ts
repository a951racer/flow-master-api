import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dotenv so it never loads the .env file during tests
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

describe("env.ts", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Reset env to a clean slate (no inherited vars from .env)
    process.env = {} as NodeJS.ProcessEnv;
    vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("calls process.exit(1) when MONGODB_URI is missing", async () => {
    process.env.PORT = "3000";
    process.env.JWT_SECRET = "secret";

    await import("../env");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("MONGODB_URI")
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when PORT is missing", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.JWT_SECRET = "secret";

    await import("../env");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("PORT")
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("calls process.exit(1) when JWT_SECRET is missing", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.PORT = "3000";

    await import("../env");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("JWT_SECRET")
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("exports a valid config object when all required vars are present", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.PORT = "4000";
    process.env.JWT_SECRET = "mysecret";
    process.env.JWT_EXPIRES_IN = "2h";
    process.env.NODE_ENV = "test";

    const { config } = await import("../env");

    expect(config.mongodbUri).toBe("mongodb://localhost:27017/test");
    expect(config.port).toBe(4000);
    expect(config.jwtSecret).toBe("mysecret");
    expect(config.jwtExpiresIn).toBe("2h");
    expect(config.nodeEnv).toBe("test");
  });

  it("defaults jwtExpiresIn to '1h' when not set", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017/test";
    process.env.PORT = "3000";
    process.env.JWT_SECRET = "mysecret";
    // JWT_EXPIRES_IN intentionally not set

    const { config } = await import("../env");

    expect(config.jwtExpiresIn).toBe("1h");
  });
});
