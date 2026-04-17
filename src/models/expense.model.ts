import mongoose, { Document, Schema, Types } from "mongoose";

export type ExpenseType = "expense" | "debt" | "bill";

export interface IExpense extends Document {
  dayOfMonth: number;
  amount: number;
  type: ExpenseType;
  payee: string;
  payeeUrl?: string;
  required: boolean;
  category: Types.ObjectId;
  paymentSource: Types.ObjectId;
  inactive: boolean;
  inactiveDate?: string;
}

const expenseSchema = new Schema<IExpense>(
  {
    dayOfMonth: { type: Number, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ["expense", "debt", "bill"] },
    payee: { type: String, required: true },
    payeeUrl: { type: String },
    required: { type: Boolean, required: true },
    category: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    paymentSource: { type: Schema.Types.ObjectId, ref: "PaymentSource", required: true },
    inactive: { type: Boolean, required: true, default: false },
    inactiveDate: { type: String },
  },
  { timestamps: true }
);

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
