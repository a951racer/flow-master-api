import { Request, Response, NextFunction } from "express";
import * as userRepository from "../repositories/user.repository";
import { sendCollection, sendData } from "../utils/response";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userRepository.findAll();
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await userRepository.update(req.params.id, req.body);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userRepository.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
