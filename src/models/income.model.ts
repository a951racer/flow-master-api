import mongoose, { Document, Schema } from "mongoose";

export interface IIncome extends Document {
  dayOfMonth: number;
  amount: number;
  source: string;
  isPaycheck: boolean;
  inactive: boolean;
  inactiveDate?: string;
}

const incomeSchema = new Schema<IIncome>(
  {
    dayOfMonth: { type: Number, required: true },
    amount: { type: Number, required: true },
    source: { type: String, required: true, maxlength: 100 },
    isPaycheck: { type: Boolean, required: true },
    inactive: { type: Boolean, required: true, default: false },
    inactiveDate: { type: String },
  },
  { timestamps: true }
);

export const Income = mongoose.model<IIncome>("Income", incomeSchema);
