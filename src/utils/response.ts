import { Response } from "express";

export function sendData(res: Response, statusCode: number, data: unknown): void {
  res.status(statusCode).json({ data });
}

export function sendCollection(res: Response, data: unknown[]): void {
  res.status(200).json({ data, count: data.length });
}

export function sendError(res: Response, statusCode: number, message: string): void {
  res.status(statusCode).json({ status: statusCode, message });
}
