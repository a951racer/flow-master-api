import { IPeriodExpense, PeriodExpense } from "../models/period-expense.model";
import { PeriodExpenseInput } from "../schemas/period-expense.schema";

export async function findAll(): Promise<IPeriodExpense[]> {
  return PeriodExpense.find();
}

export async function findById(id: string): Promise<IPeriodExpense | null> {
  return PeriodExpense.findById(id);
}

export async function create(data: PeriodExpenseInput): Promise<IPeriodExpense> {
  return PeriodExpense.create(data);
}

export async function update(id: string, data: PeriodExpenseInput): Promise<IPeriodExpense | null> {
  return PeriodExpense.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await PeriodExpense.findByIdAndDelete(id);
  return result !== null;
}
