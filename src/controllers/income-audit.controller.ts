import { Request, Response, NextFunction } from "express";
import * as incomeAuditRepository from "../repositories/income-audit.repository";
import { sendCollection } from "../utils/response";

export async function getAuditTrail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await incomeAuditRepository.findByIncomeId(req.params.id);
    sendCollection(res, data);
  } catch (err) {
    next(err);
  }
}
