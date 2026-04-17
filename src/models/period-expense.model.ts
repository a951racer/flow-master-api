import mongoose, { Document, Schema, Types } from "mongoose";

export type PeriodExpenseStatus = "Unpaid" | "Paid" | "Deferred";

export interface IPeriodExpense extends Document {
  period: Types.ObjectId;
  expense: Types.ObjectId;
  status: PeriodExpenseStatus;
  overrideAmount?: number;
}

const periodExpenseSchema = new Schema<IPeriodExpense>(
  {
    period: { type: Schema.Types.ObjectId, ref: "Period", required: true },
    expense: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    status: { type: String, required: true, enum: ["Unpaid", "Paid", "Deferred"] },
    overrideAmount: { type: Number },
  },
  { timestamps: true }
);

export const PeriodExpense = mongoose.model<IPeriodExpense>(
  "PeriodExpense",
  periodExpenseSchema,
  "period-expenses"
);
