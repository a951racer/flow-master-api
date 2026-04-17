import * as expenseRepository from "../repositories/expense.repository";
import { IExpense } from "../models/expense.model";
import { ExpenseInput } from "../schemas/expense.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IExpense[]> {
  return expenseRepository.findAll();
}

export async function findById(id: string): Promise<IExpense> {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw new AppError(404, "Expense not found");
  return expense;
}

export async function create(data: ExpenseInput): Promise<IExpense> {
  return expenseRepository.create(data);
}

export async function update(id: string, data: ExpenseInput): Promise<IExpense> {
  const expense = await expenseRepository.update(id, data);
  if (!expense) throw new AppError(404, "Expense not found");
  return expense;
}

export async function remove(id: string): Promise<void> {
  const deleted = await expenseRepository.remove(id);
  if (!deleted) throw new AppError(404, "Expense not found");
}
