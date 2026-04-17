import { Request, Response, NextFunction } from "express";
import * as expenseService from "../services/expense.service";
import { sendData, sendCollection } from "../utils/response";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await expenseService.findAll();
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await expenseService.findById(req.params.id);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await expenseService.create(req.body);
    sendData(res, 201, data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await expenseService.update(req.params.id, req.body);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await expenseService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
