import { IPeriodIncome, PeriodIncome } from "../models/period-income.model";
import { PeriodIncomeInput } from "../schemas/period-income.schema";

export async function findAll(): Promise<IPeriodIncome[]> {
  return PeriodIncome.find();
}

export async function findById(id: string): Promise<IPeriodIncome | null> {
  return PeriodIncome.findById(id);
}

export async function create(data: PeriodIncomeInput): Promise<IPeriodIncome> {
  return PeriodIncome.create(data);
}

export async function update(id: string, data: PeriodIncomeInput): Promise<IPeriodIncome | null> {
  return PeriodIncome.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await PeriodIncome.findByIdAndDelete(id);
  return result !== null;
}
