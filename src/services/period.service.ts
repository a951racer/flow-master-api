import * as periodRepository from "../repositories/period.repository";
import { IPeriod } from "../models/period.model";
import { PeriodInput } from "../schemas/period.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IPeriod[]> {
  return periodRepository.findAll();
}

export async function findById(id: string): Promise<IPeriod> {
  const period = await periodRepository.findById(id);
  if (!period) throw new AppError(404, "Period not found");
  return period;
}

export async function create(data: PeriodInput): Promise<IPeriod> {
  return periodRepository.create(data);
}

export async function update(id: string, data: PeriodInput): Promise<IPeriod> {
  const period = await periodRepository.update(id, data);
  if (!period) throw new AppError(404, "Period not found");
  return period;
}

export async function remove(id: string): Promise<void> {
  const deleted = await periodRepository.remove(id);
  if (!deleted) throw new AppError(404, "Period not found");
}
