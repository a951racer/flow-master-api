import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../models/user.model");

import { User } from "../../models/user.model";
import { findAll, findByEmail, create, update, remove } from "../user.repository";

const fakeUserWithPassword = {
  _id: "abc123abc123abc123abc123",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  password: "hashed_pw",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeUserWithoutPassword = {
  _id: "abc123abc123abc123abc123",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("findAll", () => {
  it("returns users without password field", async () => {
    const selectMock = vi.fn().mockResolvedValue([fakeUserWithoutPassword]);
    vi.mocked(User.find).mockReturnValue({ select: selectMock } as never);

    const result = await findAll();

    expect(User.find).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledWith("-password");
    expect(result).toEqual([fakeUserWithoutPassword]);
  });
});

describe("findByEmail", () => {
  it("returns a user when found", async () => {
    vi.mocked(User.findOne).mockResolvedValue(fakeUserWithPassword as never);

    const result = await findByEmail("jane@example.com");

    expect(User.findOne).toHaveBeenCalledWith({ email: "jane@example.com" });
    expect(result).toEqual(fakeUserWithPassword);
  });

  it("returns null when not found", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);

    const result = await findByEmail("nobody@example.com");

    expect(result).toBeNull();
  });
});

describe("create", () => {
  it("creates and returns a user document", async () => {
    vi.mocked(User.create).mockResolvedValue(fakeUserWithPassword as never);

    const input = {
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      password: "hashed_pw",
    };
    const result = await create(input);

    expect(User.create).toHaveBeenCalledWith(input);
    expect(result).toEqual(fakeUserWithPassword);
  });
});

describe("update", () => {
  it("returns the updated user without password when found", async () => {
    const selectMock = vi.fn().mockResolvedValue(fakeUserWithoutPassword);
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({ select: selectMock } as never);

    const result = await update("abc123abc123abc123abc123", { firstName: "Janet" });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "abc123abc123abc123abc123",
      { firstName: "Janet" },
      { new: true }
    );
    expect(selectMock).toHaveBeenCalledWith("-password");
    expect(result).toEqual(fakeUserWithoutPassword);
  });

  it("returns null when user is not found", async () => {
    const selectMock = vi.fn().mockResolvedValue(null);
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({ select: selectMock } as never);

    const result = await update("000000000000000000000000", { firstName: "Ghost" });

    expect(result).toBeNull();
  });

  it("does not include password in the update payload type", async () => {
    // TypeScript enforces Partial<Omit<IUser, "password">> — this test documents the contract
    const selectMock = vi.fn().mockResolvedValue(fakeUserWithoutPassword);
    vi.mocked(User.findByIdAndUpdate).mockReturnValue({ select: selectMock } as never);

    // Only non-password fields are passed
    const result = await update("abc123abc123abc123abc123", { email: "new@example.com" });

    expect(result).toEqual(fakeUserWithoutPassword);
  });
});

describe("remove", () => {
  it("calls findByIdAndDelete with the given id", async () => {
    vi.mocked(User.findByIdAndDelete).mockResolvedValue(null);

    await remove("abc123abc123abc123abc123");

    expect(User.findByIdAndDelete).toHaveBeenCalledWith("abc123abc123abc123abc123");
  });

  it("resolves without error when user does not exist", async () => {
    vi.mocked(User.findByIdAndDelete).mockResolvedValue(null);

    await expect(remove("000000000000000000000000")).resolves.toBeUndefined();
  });
});
