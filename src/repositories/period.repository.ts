import { IPeriod, Period } from "../models/period.model";
import { PeriodInput } from "../schemas/period.schema";

const populateOptions = [
  { path: "incomes.income" },
  {
    path: "expenses.expense",
    populate: [
      { path: "category" },
      { path: "paymentSource" },
    ],
  },
];

export async function findAll(): Promise<IPeriod[]> {
  return Period.find().populate(populateOptions);
}

export async function findLatest(): Promise<IPeriod | null> {
  return Period.findOne().sort({ endDate: -1 }).populate(populateOptions);
}

export async function findById(id: string): Promise<IPeriod | null> {
  return Period.findById(id).populate(populateOptions);
}

export async function create(data: PeriodInput): Promise<IPeriod> {
  const period = await Period.create(data);
  return period.populate(populateOptions);
}

export async function createMany(data: PeriodInput[]): Promise<IPeriod[]> {
  const periods = await (Period.insertMany(data) as unknown as IPeriod[]);
  return Period.find({ _id: { $in: periods.map((p) => p._id) } }).populate(populateOptions);
}

export async function update(id: string, data: PeriodInput): Promise<IPeriod | null> {
  return Period.findByIdAndUpdate(id, data, { new: true }).populate(populateOptions);
}

export async function remove(id: string): Promise<boolean> {
  const result = await Period.findByIdAndDelete(id);
  return result !== null;
}

/**
 * Remove a specific expense from the expenses array of all active periods
 * (periods whose endDate >= today).
 */
export async function removeExpenseFromActivePeriods(expenseId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await Period.updateMany(
    { endDate: { $gte: today } },
    { $pull: { expenses: { expense: expenseId } } }
  );
}

/**
 * Remove a specific income from the incomes array of all active periods
 * (periods whose endDate >= today).
 */
export async function removeIncomeFromActivePeriods(incomeId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await Period.updateMany(
    { endDate: { $gte: today } },
    { $pull: { incomes: { income: incomeId } } }
  );
}

/** Returns true if dayOfMonth falls within [startDate, endDate] inclusive. */
function dayFallsInPeriod(dayOfMonth: number, startDate: string, endDate: string): boolean {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const clampedDay = Math.min(dayOfMonth, lastDay);
    const candidate = new Date(year, month, clampedDay);
    if (candidate >= start && candidate <= end) return true;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return false;
}

/**
 * Add an expense subdocument to all active periods (endDate >= today) where
 * the expense's dayOfMonth falls within the period's date range, and the
 * expense is not already present.
 */
export async function addExpenseToActivePeriods(expenseId: string, dayOfMonth: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const activePeriods = await Period.find({ endDate: { $gte: today } });
  for (const period of activePeriods) {
    const alreadyPresent = period.expenses.some((e) => String(e.expense) === expenseId);
    if (!alreadyPresent && dayFallsInPeriod(dayOfMonth, period.startDate, period.endDate)) {
      await Period.updateOne(
        { _id: period._id },
        { $push: { expenses: { expense: expenseId, status: "Unpaid" } } }
      );
    }
  }
}

/**
 * Add an income subdocument to all active periods (endDate >= today) where
 * the income's dayOfMonth falls within the period's date range, and the
 * income is not already present.
 */
export async function addIncomeToActivePeriods(incomeId: string, dayOfMonth: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const activePeriods = await Period.find({ endDate: { $gte: today } });
  for (const period of activePeriods) {
    const alreadyPresent = period.incomes.some((e) => String(e.income) === incomeId);
    if (!alreadyPresent && dayFallsInPeriod(dayOfMonth, period.startDate, period.endDate)) {
      await Period.updateOne(
        { _id: period._id },
        { $push: { incomes: { income: incomeId, isReceived: false } } }
      );
    }
  }
}
