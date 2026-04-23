import * as expenseRepository from "../repositories/expense.repository";
import * as expenseAuditRepository from "../repositories/expense-audit.repository";
import * as periodRepository from "../repositories/period.repository";
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

function normalizeField(value: unknown): unknown {
  if (value == null) return null;
  // Populated subdocument or ObjectId — normalize to string id
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj._id != null) return String(obj._id);
    return String(value);
  }
  return value;
}

function diffChanges(before: IExpense, after: ExpenseInput): IExpenseAuditChange[] {
  return AUDITED_FIELDS.reduce<IExpenseAuditChange[]>((acc, field) => {
    const rawPrev = (before as unknown as Record<string, unknown>)[field];
    const prev = normalizeField(rawPrev);
    const next = (after as unknown as Record<string, unknown>)[field] ?? null;
    if (prev !== next) {
      acc.push({ field, previousValue: prev, newValue: next });
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
  // If created as active, add to matching active periods
  if (!data.inactive) {
    await periodRepository.addExpenseToActivePeriods(String(expense._id), data.dayOfMonth);
  }
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
  // Cascade: if expense was just marked inactive, remove it from all active periods
  if (!before.inactive && data.inactive === true) {
    await periodRepository.removeExpenseFromActivePeriods(id);
  }
  // Cascade: if expense was just re-activated, add it to matching active periods
  if (before.inactive && data.inactive === false) {
    await periodRepository.addExpenseToActivePeriods(id, data.dayOfMonth);
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
      return { field: f, previousValue: normalizeField(val), newValue: null };
    });
  await expenseAuditRepository.create(id, "deleted", changes);
}
