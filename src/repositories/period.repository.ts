import { IPeriod, Period } from "../models/period.model";
import { PeriodInput } from "../schemas/period.schema";

const populateOptions = [
  { path: "incomes.income" },
  { path: "expenses.expense" },
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
