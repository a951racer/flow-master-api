import mongoose, { Document, Schema, Types } from "mongoose";

export type PeriodIncomeStatus = "Pending" | "Received";

export interface IPeriodIncome extends Document {
  period: Types.ObjectId;
  income: Types.ObjectId;
  status: PeriodIncomeStatus;
  overrideAmount?: number;
}

const periodIncomeSchema = new Schema<IPeriodIncome>(
  {
    period: { type: Schema.Types.ObjectId, ref: "Period", required: true },
    income: { type: Schema.Types.ObjectId, ref: "Income", required: true },
    status: { type: String, required: true, enum: ["Pending", "Received"] },
    overrideAmount: { type: Number },
  },
  { timestamps: true }
);

export const PeriodIncome = mongoose.model<IPeriodIncome>(
  "PeriodIncome",
  periodIncomeSchema,
  "period-incomes"
);
