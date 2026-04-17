import * as periodIncomeRepository from "../repositories/period-income.repository";
import { IPeriodIncome } from "../models/period-income.model";
import { PeriodIncomeInput } from "../schemas/period-income.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IPeriodIncome[]> {
  return periodIncomeRepository.findAll();
}

export async function findById(id: string): Promise<IPeriodIncome> {
  const periodIncome = await periodIncomeRepository.findById(id);
  if (!periodIncome) throw new AppError(404, "PeriodIncome not found");
  return periodIncome;
}

export async function create(data: PeriodIncomeInput): Promise<IPeriodIncome> {
  return periodIncomeRepository.create(data);
}

export async function update(id: string, data: PeriodIncomeInput): Promise<IPeriodIncome> {
  const periodIncome = await periodIncomeRepository.update(id, data);
  if (!periodIncome) throw new AppError(404, "PeriodIncome not found");
  return periodIncome;
}

export async function remove(id: string): Promise<void> {
  const deleted = await periodIncomeRepository.remove(id);
  if (!deleted) throw new AppError(404, "PeriodIncome not found");
}
