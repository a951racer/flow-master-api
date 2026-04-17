import { Request, Response, NextFunction } from "express";
import * as paymentSourceService from "../services/payment-source.service";
import { sendData, sendCollection } from "../utils/response";

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentSourceService.findAll();
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentSourceService.findById(req.params.id);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentSourceService.create(req.body);
    sendData(res, 201, data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await paymentSourceService.update(req.params.id, req.body);
    sendData(res, 200, data);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await paymentSourceService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
