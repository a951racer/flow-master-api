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
