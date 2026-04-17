import * as incomeRepository from "../repositories/income.repository";
import { IIncome } from "../models/income.model";
import { IncomeInput } from "../schemas/income.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IIncome[]> {
  return incomeRepository.findAll();
}

export async function findById(id: string): Promise<IIncome> {
  const income = await incomeRepository.findById(id);
  if (!income) throw new AppError(404, "Income not found");
  return income;
}

export async function create(data: IncomeInput): Promise<IIncome> {
  return incomeRepository.create(data);
}

export async function update(id: string, data: IncomeInput): Promise<IIncome> {
  const income = await incomeRepository.update(id, data);
  if (!income) throw new AppError(404, "Income not found");
  return income;
}

export async function remove(id: string): Promise<void> {
  const deleted = await incomeRepository.remove(id);
  if (!deleted) throw new AppError(404, "Income not found");
}
