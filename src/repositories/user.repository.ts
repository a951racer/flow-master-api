import { IUser, User } from "../models/user.model";
import { RegisterInput } from "../schemas/user.schema";

export async function findAll(): Promise<Omit<IUser, "password">[]> {
  return User.find().select("-password") as unknown as Omit<IUser, "password">[];
}

export async function findByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email });
}

export async function create(data: RegisterInput): Promise<IUser> {
  return User.create(data);
}

export async function update(id: string, data: Partial<Omit<IUser, "password">>): Promise<Omit<IUser, "password"> | null> {
  return User.findByIdAndUpdate(id, data, { new: true }).select("-password") as unknown as Omit<IUser, "password"> | null;
}

export async function remove(id: string): Promise<void> {
  await User.findByIdAndDelete(id);
}
