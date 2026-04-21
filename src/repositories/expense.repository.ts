import { IExpense, Expense } from "../models/expense.model";
import { ExpenseInput } from "../schemas/expense.schema";

const populateOptions = [
  { path: "category" },
  { path: "paymentSource" },
];

export async function findAll(): Promise<IExpense[]> {
  return Expense.find().populate(populateOptions);
}

export async function findById(id: string): Promise<IExpense | null> {
  return Expense.findById(id).populate(populateOptions);
}

export async function findActive(): Promise<IExpense[]> {
  return Expense.find({ inactive: { $ne: true } }).populate(populateOptions);
}

export async function create(data: ExpenseInput): Promise<IExpense> {
  const expense = await Expense.create(data);
  return expense.populate(populateOptions);
}

export async function update(id: string, data: ExpenseInput): Promise<IExpense | null> {
  return Expense.findByIdAndUpdate(id, data, { new: true }).populate(populateOptions);
}

export async function remove(id: string): Promise<boolean> {
  const result = await Expense.findByIdAndDelete(id);
  return result !== null;
}
