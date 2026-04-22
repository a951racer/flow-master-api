import * as incomeRepository from "../repositories/income.repository";
import * as incomeAuditRepository from "../repositories/income-audit.repository";
import * as periodRepository from "../repositories/period.repository";
import { IIncome } from "../models/income.model";
import { IIncomeAuditChange } from "../models/income-audit.model";
import { IncomeInput } from "../schemas/income.schema";
import { AppError } from "../utils/app-error";

const AUDITED_FIELDS: (keyof IncomeInput)[] = [
  "dayOfMonth",
  "amount",
  "source",
  "isPaycheck",
  "inactive",
  "inactiveDate",
];

function diffChanges(before: IIncome, after: IncomeInput): IIncomeAuditChange[] {
  return AUDITED_FIELDS.reduce<IIncomeAuditChange[]>((acc, field) => {
    const prev = (before as unknown as Record<string, unknown>)[field];
    const next = (after as unknown as Record<string, unknown>)[field];
    if (prev !== next) {
      acc.push({ field, previousValue: prev ?? null, newValue: next ?? null });
    }
    return acc;
  }, []);
}

export async function findAll(): Promise<IIncome[]> {
  return incomeRepository.findAll();
}

export async function findById(id: string): Promise<IIncome> {
  const income = await incomeRepository.findById(id);
  if (!income) throw new AppError(404, "Income not found");
  return income;
}

export async function create(data: IncomeInput): Promise<IIncome> {
  const income = await incomeRepository.create(data);
  const changes: IIncomeAuditChange[] = AUDITED_FIELDS
    .filter((f) => (data as Record<string, unknown>)[f] !== undefined)
    .map((f) => ({ field: f, previousValue: null, newValue: (data as Record<string, unknown>)[f] ?? null }));
  await incomeAuditRepository.create(String(income._id), "created", changes);
  return income;
}

export async function update(id: string, data: IncomeInput): Promise<IIncome> {
  const before = await incomeRepository.findById(id);
  if (!before) throw new AppError(404, "Income not found");
  const after = await incomeRepository.update(id, data);
  if (!after) throw new AppError(404, "Income not found");
  const changes = diffChanges(before, data);
  if (changes.length > 0) {
    await incomeAuditRepository.create(id, "updated", changes);
  }
  // Cascade: if income was just deactivated, remove from active periods
  const wasActive = !before.inactive;
  const nowInactive = data.inactive === true;
  if (wasActive && nowInactive) {
    await periodRepository.removeIncomeFromActivePeriods(id);
  }
  return after;
}

export async function remove(id: string): Promise<void> {
  const before = await incomeRepository.findById(id);
  if (!before) throw new AppError(404, "Income not found");
  const deleted = await incomeRepository.remove(id);
  if (!deleted) throw new AppError(404, "Income not found");
  const changes: IIncomeAuditChange[] = AUDITED_FIELDS
    .filter((f) => (before as unknown as Record<string, unknown>)[f] !== undefined)
    .map((f) => ({ field: f, previousValue: (before as unknown as Record<string, unknown>)[f] ?? null, newValue: null }));
  await incomeAuditRepository.create(id, "deleted", changes);
}
