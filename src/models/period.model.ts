import mongoose, { Document, Schema, Types } from "mongoose";

export type PeriodIncomeStatus = "Pending" | "Received";
export type PeriodExpenseStatus = "Unpaid" | "Paid" | "Deferred";

export interface IPeriodIncomeEntry {
  income: Types.ObjectId;
  status: PeriodIncomeStatus;
  overrideAmount?: number;
}

export interface IPeriodExpenseEntry {
  expense: Types.ObjectId;
  status: PeriodExpenseStatus;
  overrideAmount?: number;
}

export interface IPeriod extends Document {
  startDate: string;
  endDate: string;
  incomes: IPeriodIncomeEntry[];
  expenses: IPeriodExpenseEntry[];
}

const periodIncomeEntrySchema = new Schema<IPeriodIncomeEntry>(
  {
    income: { type: Schema.Types.ObjectId, ref: "Income", required: true },
    status: { type: String, required: true, enum: ["Pending", "Received"] },
    overrideAmount: { type: Number },
  },
  { _id: false }
);

const periodExpenseEntrySchema = new Schema<IPeriodExpenseEntry>(
  {
    expense: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    status: { type: String, required: true, enum: ["Unpaid", "Paid", "Deferred"] },
    overrideAmount: { type: Number },
  },
  { _id: false }
);

const periodSchema = new Schema<IPeriod>(
  {
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    incomes: { type: [periodIncomeEntrySchema], default: [] },
    expenses: { type: [periodExpenseEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const Period = mongoose.model<IPeriod>("Period", periodSchema);
