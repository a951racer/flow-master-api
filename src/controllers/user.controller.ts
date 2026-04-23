import { Request, Response, NextFunction } from "express";
import * as userRepository from "../repositories/user.repository";
import { sendCollection } from "../utils/response";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userRepository.findAll();
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}
