import { IExpense, Expense } from "../models/expense.model";
import { ExpenseInput } from "../schemas/expense.schema";

export async function findAll(): Promise<IExpense[]> {
  return Expense.find();
}

export async function findById(id: string): Promise<IExpense | null> {
  return Expense.findById(id);
}

export async function create(data: ExpenseInput): Promise<IExpense> {
  return Expense.create(data);
}

export async function update(id: string, data: ExpenseInput): Promise<IExpense | null> {
  return Expense.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await Expense.findByIdAndDelete(id);
  return result !== null;
}
