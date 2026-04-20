import { IPeriod, Period } from "../models/period.model";
import { PeriodInput } from "../schemas/period.schema";

export async function findAll(): Promise<IPeriod[]> {
  return Period.find();
}

export async function findLatest(): Promise<IPeriod | null> {
  return Period.findOne().sort({ endDate: -1 });
}

export async function findById(id: string): Promise<IPeriod | null> {
  return Period.findById(id);
}

export async function create(data: PeriodInput): Promise<IPeriod> {
  return Period.create(data);
}

export async function createMany(data: PeriodInput[]): Promise<IPeriod[]> {
  return Period.insertMany(data) as unknown as IPeriod[];
}

export async function update(id: string, data: PeriodInput): Promise<IPeriod | null> {
  return Period.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await Period.findByIdAndDelete(id);
  return result !== null;
}
