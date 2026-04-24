import * as periodRepository from "../repositories/period.repository";
import * as incomeRepository from "../repositories/income.repository";
import * as expenseRepository from "../repositories/expense.repository";
import { IPeriod } from "../models/period.model";
import { PeriodInput } from "../schemas/period.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IPeriod[]> {
  return periodRepository.findAll();
}

export async function findById(id: string): Promise<IPeriod> {
  const period = await periodRepository.findById(id);
  if (!period) throw new AppError(404, "Period not found");
  return period;
}

export async function create(data: PeriodInput): Promise<IPeriod> {
  return periodRepository.create(data);
}

/** Returns true if `dayOfMonth` falls within [startDate, endDate] inclusive. */
function dayFallsInPeriod(dayOfMonth: number, startDate: string, endDate: string): boolean {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Walk every month that overlaps the period and check if dayOfMonth exists in it
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= endMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    // Clamp dayOfMonth to the actual last day of this month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(dayOfMonth, lastDayOfMonth);
    const candidate = new Date(year, month, clampedDay);
    if (candidate >= start && candidate <= end) {
      return true;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return false;
}

/** Given an anchor date, returns the next period's startDate using paycheckDays. */
function nextStartAfter(anchorDate: Date, paycheckDays: number[]): Date {
  const anchorDay = anchorDate.getDate();
  let startYear = anchorDate.getFullYear();
  let startMonth = anchorDate.getMonth();
  let startDay = paycheckDays.find((d) => d > anchorDay) ?? null;

  if (startDay === null) {
    startMonth += 1;
    if (startMonth > 11) { startMonth = 0; startYear += 1; }
    startDay = paycheckDays[0];
  }

  return new Date(startYear, startMonth, startDay);
}

/**
 * Generate `count` consecutive periods based on active paycheck income days.
 * Each period is populated with:
 *  - incomes: all active incomes whose dayOfMonth falls within the period
 *  - expenses: all active expenses whose dayOfMonth falls within the period
 */
export async function generatePeriods(count: number): Promise<IPeriod[]> {
  const paychecks = await incomeRepository.findActivePaychecks();
  if (paychecks.length === 0) {
    throw new AppError(422, "No active paycheck incomes found to determine period dates");
  }

  const paycheckDays = [...new Set(paychecks.map((p) => p.dayOfMonth))].sort((a, b) => a - b);

  const [latest, activeIncomes, activeExpenses] = await Promise.all([
    periodRepository.findLatest(),
    incomeRepository.findActive(),
    expenseRepository.findActive(),
  ]);

  let anchorDate: Date;
  if (latest) {
    anchorDate = new Date(latest.endDate + "T00:00:00");
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    anchorDate = yesterday;
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const created: IPeriod[] = [];

  for (let i = 0; i < count; i++) {
    const startDate = nextStartAfter(anchorDate, paycheckDays);

    // endDate = day before the *next* period's startDate
    const nextStart = nextStartAfter(startDate, paycheckDays);
    const endDate = new Date(nextStart);
    endDate.setDate(endDate.getDate() - 1);

    const startStr = fmt(startDate);
    const endStr = fmt(endDate);

    const incomes = activeIncomes
      .filter((inc) => dayFallsInPeriod(inc.dayOfMonth, startStr, endStr))
      .map((inc) => ({ income: inc._id.toString(), isReceived: false }));

    const expenses = activeExpenses
      .filter((exp) => dayFallsInPeriod(exp.dayOfMonth, startStr, endStr))
      .map((exp) => ({ expense: exp._id.toString(), status: "Unpaid" as const }));

    const newPeriod = await periodRepository.create({ startDate: startStr, endDate: endStr, incomes, expenses });
    created.push(newPeriod);

    anchorDate = endDate;
  }

  return created;
}

export async function update(id: string, data: PeriodInput): Promise<IPeriod> {
  const period = await periodRepository.update(id, data);
  if (!period) throw new AppError(404, "Period not found");
  return period;
}

export async function remove(id: string): Promise<void> {
  const deleted = await periodRepository.remove(id);
  if (!deleted) throw new AppError(404, "Period not found");
}
