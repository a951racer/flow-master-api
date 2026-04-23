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
