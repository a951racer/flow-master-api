import * as periodExpenseRepository from "../repositories/period-expense.repository";
import { IPeriodExpense } from "../models/period-expense.model";
import { PeriodExpenseInput } from "../schemas/period-expense.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IPeriodExpense[]> {
  return periodExpenseRepository.findAll();
}

export async function findById(id: string): Promise<IPeriodExpense> {
  const periodExpense = await periodExpenseRepository.findById(id);
  if (!periodExpense) throw new AppError(404, "PeriodExpense not found");
  return periodExpense;
}

export async function create(data: PeriodExpenseInput): Promise<IPeriodExpense> {
  return periodExpenseRepository.create(data);
}

export async function update(id: string, data: PeriodExpenseInput): Promise<IPeriodExpense> {
  const periodExpense = await periodExpenseRepository.update(id, data);
  if (!periodExpense) throw new AppError(404, "PeriodExpense not found");
  return periodExpense;
}

export async function remove(id: string): Promise<void> {
  const deleted = await periodExpenseRepository.remove(id);
  if (!deleted) throw new AppError(404, "PeriodExpense not found");
}
