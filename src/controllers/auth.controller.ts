import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { sendData } from "../utils/response";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = await authService.register(req.body);
    sendData(res, 201, { token });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const token = await authService.login(email, password);
    sendData(res, 200, { token });
  } catch (err) {
    next(err);
  }
}
