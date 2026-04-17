import * as expenseCategoryRepository from "../repositories/expense-category.repository";
import { IExpenseCategory } from "../models/expense-category.model";
import { ExpenseCategoryInput } from "../schemas/expense-category.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IExpenseCategory[]> {
  return expenseCategoryRepository.findAll();
}

export async function findById(id: string): Promise<IExpenseCategory> {
  const category = await expenseCategoryRepository.findById(id);
  if (!category) throw new AppError(404, "ExpenseCategory not found");
  return category;
}

export async function create(data: ExpenseCategoryInput): Promise<IExpenseCategory> {
  return expenseCategoryRepository.create(data);
}

export async function update(id: string, data: ExpenseCategoryInput): Promise<IExpenseCategory> {
  const category = await expenseCategoryRepository.update(id, data);
  if (!category) throw new AppError(404, "ExpenseCategory not found");
  return category;
}

export async function remove(id: string): Promise<void> {
  const deleted = await expenseCategoryRepository.remove(id);
  if (!deleted) throw new AppError(404, "ExpenseCategory not found");
}
