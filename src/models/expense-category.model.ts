import mongoose, { Document, Schema } from "mongoose";

export interface IExpenseCategory extends Document {
  category: string;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
  {
    category: { type: String, required: true, maxlength: 100 },
  },
  { timestamps: true }
);

export const ExpenseCategory = mongoose.model<IExpenseCategory>(
  "ExpenseCategory",
  expenseCategorySchema,
  "expense-categories"
);
