import * as expenseRepository from "../repositories/expense.repository";
import * as expenseAuditRepository from "../repositories/expense-audit.repository";
import { IExpense } from "../models/expense.model";
import { IExpenseAuditChange } from "../models/expense-audit.model";
import { ExpenseInput } from "../schemas/expense.schema";
import { AppError } from "../utils/app-error";

const AUDITED_FIELDS: (keyof ExpenseInput)[] = [
  "dayOfMonth",
  "amount",
  "type",
  "payee",
  "payeeUrl",
  "required",
  "category",
  "paymentSource",
  "inactive",
  "inactiveDate",
];

function diffChanges(before: IExpense, after: ExpenseInput): IExpenseAuditChange[] {
  return AUDITED_FIELDS.reduce<IExpenseAuditChange[]>((acc, field) => {
    const prev = (before as unknown as Record<string, unknown>)[field];
    // ObjectId fields need string comparison
    const prevNorm = prev != null && typeof prev === "object" ? String(prev) : prev;
    const next = (after as unknown as Record<string, unknown>)[field];
    if (prevNorm !== next) {
      acc.push({ field, previousValue: prevNorm ?? null, newValue: next ?? null });
    }
    return acc;
  }, []);
}

export async function findAll(): Promise<IExpense[]> {
  return expenseRepository.findAll();
}

export async function findById(id: string): Promise<IExpense> {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw new AppError(404, "Expense not found");
  return expense;
}

export async function create(data: ExpenseInput): Promise<IExpense> {
  const expense = await expenseRepository.create(data);
  const changes: IExpenseAuditChange[] = AUDITED_FIELDS
    .filter((f) => (data as Record<string, unknown>)[f] !== undefined)
    .map((f) => ({ field: f, previousValue: null, newValue: (data as Record<string, unknown>)[f] ?? null }));
  await expenseAuditRepository.create(String(expense._id), "created", changes);
  return expense;
}

export async function update(id: string, data: ExpenseInput): Promise<IExpense> {
  const before = await expenseRepository.findById(id);
  if (!before) throw new AppError(404, "Expense not found");
  const after = await expenseRepository.update(id, data);
  if (!after) throw new AppError(404, "Expense not found");
  const changes = diffChanges(before, data);
  if (changes.length > 0) {
    await expenseAuditRepository.create(id, "updated", changes);
  }
  return after;
}

export async function remove(id: string): Promise<void> {
  const before = await expenseRepository.findById(id);
  if (!before) throw new AppError(404, "Expense not found");
  const deleted = await expenseRepository.remove(id);
  if (!deleted) throw new AppError(404, "Expense not found");
  const changes: IExpenseAuditChange[] = AUDITED_FIELDS
    .filter((f) => (before as unknown as Record<string, unknown>)[f] !== undefined)
    .map((f) => {
      const val = (before as unknown as Record<string, unknown>)[f];
      const prevNorm = val != null && typeof val === "object" ? String(val) : val;
      return { field: f, previousValue: prevNorm ?? null, newValue: null };
    });
  await expenseAuditRepository.create(id, "deleted", changes);
}
