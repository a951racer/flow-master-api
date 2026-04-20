import { IIncome, Income } from "../models/income.model";
import { IncomeInput } from "../schemas/income.schema";

export async function findAll(): Promise<IIncome[]> {
  return Income.find();
}

export async function findById(id: string): Promise<IIncome | null> {
  return Income.findById(id);
}

export async function findActivePaychecks(): Promise<IIncome[]> {
  return Income.find({ isPaycheck: true, inactive: { $ne: true } });
}

export async function findActive(): Promise<IIncome[]> {
  return Income.find({ inactive: { $ne: true } });
}

export async function create(data: IncomeInput): Promise<IIncome> {
  return Income.create(data);
}

export async function update(id: string, data: IncomeInput): Promise<IIncome | null> {
  return Income.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await Income.findByIdAndDelete(id);
  return result !== null;
}
