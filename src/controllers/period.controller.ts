import { Request, Response, NextFunction } from "express";
import * as periodService from "../services/period.service";
import { sendData, sendCollection } from "../utils/response";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await periodService.findAll();
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await periodService.findById(req.params.id);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function generate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = parseInt(req.params.count, 10);
    if (!Number.isInteger(count) || count < 1 || count > 12) {
      res.status(400).json({ status: 400, message: "count must be an integer between 1 and 12" });
      return;
    }
    const data = await periodService.generatePeriods(count);
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await periodService.create(req.body);
    sendData(res, 201, data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await periodService.update(req.params.id, req.body);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await periodService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
