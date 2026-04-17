import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, login } from "../auth.service";
import { AppError } from "../../utils/app-error";

vi.mock("../../repositories/user.repository");
vi.mock("../../utils/token.service");
vi.mock("bcrypt");

import * as userRepository from "../../repositories/user.repository";
import * as tokenService from "../../utils/token.service";
import bcrypt from "bcrypt";

const fakeUser = {
  _id: "user123",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "hashed_password",
};

const fakeToken = "fake.jwt.token";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tokenService.signToken).mockReturnValue(fakeToken);
});

describe("register", () => {
  it("creates a user and returns a non-empty JWT string", async () => {
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_password" as never);
    vi.mocked(userRepository.create).mockResolvedValue(fakeUser as never);

    const token = await register({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
    });

    expect(token).toBe(fakeToken);
    expect(token.length).toBeGreaterThan(0);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: "hashed_password" })
    );
    expect(tokenService.signToken).toHaveBeenCalledWith({ userId: "user123" });
  });
});

describe("login", () => {
  it("returns a JWT string with correct credentials", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(fakeUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const token = await login("john@example.com", "password123");

    expect(token).toBe(fakeToken);
    expect(tokenService.signToken).toHaveBeenCalledWith({ userId: "user123" });
  });

  it("throws AppError with status 401 when password is wrong", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(fakeUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(login("john@example.com", "wrongpassword")).rejects.toThrow(AppError);

    const error = await login("john@example.com", "wrongpassword").catch((e) => e);
    expect(error.statusCode).toBe(401);
  });

  it("throws AppError with status 401 when email is unknown", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    await expect(login("unknown@example.com", "password123")).rejects.toThrow(AppError);

    const error = await login("unknown@example.com", "password123").catch((e) => e);
    expect(error.statusCode).toBe(401);
  });
});
