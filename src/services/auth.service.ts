import bcrypt from "bcrypt";
import * as userRepository from "../repositories/user.repository";
import * as tokenService from "../utils/token.service";
import { AppError } from "../utils/app-error";
import { RegisterInput, LoginInput } from "../schemas/user.schema";

export async function register(data: RegisterInput): Promise<string> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await userRepository.create({ ...data, password: hashedPassword });
  return tokenService.signToken({ userId: user._id });
}

export async function login(email: string, password: string): Promise<string> {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError(401, "Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError(401, "Invalid credentials");

  return tokenService.signToken({ userId: user._id });
}
