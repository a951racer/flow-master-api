import { IExpenseCategory, ExpenseCategory } from "../models/expense-category.model";
import { ExpenseCategoryInput } from "../schemas/expense-category.schema";

export async function findAll(): Promise<IExpenseCategory[]> {
  return ExpenseCategory.find();
}

export async function findById(id: string): Promise<IExpenseCategory | null> {
  return ExpenseCategory.findById(id);
}

export async function create(data: ExpenseCategoryInput): Promise<IExpenseCategory> {
  return ExpenseCategory.create(data);
}

export async function update(id: string, data: ExpenseCategoryInput): Promise<IExpenseCategory | null> {
  return ExpenseCategory.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await ExpenseCategory.findByIdAndDelete(id);
  return result !== null;
}
