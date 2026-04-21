import mongoose, { Document, Schema, Types } from "mongoose";

export type ExpenseAuditAction = "created" | "updated" | "deleted";

export interface IExpenseAuditChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface IExpenseAudit extends Document {
  expenseId: Types.ObjectId;
  action: ExpenseAuditAction;
  changedAt: Date;
  changes: IExpenseAuditChange[];
}

const expenseAuditChangeSchema = new Schema<IExpenseAuditChange>(
  {
    field: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const expenseAuditSchema = new Schema<IExpenseAudit>(
  {
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", required: true },
    action: { type: String, required: true, enum: ["created", "updated", "deleted"] },
    changedAt: { type: Date, required: true, default: () => new Date() },
    changes: { type: [expenseAuditChangeSchema], default: [] },
  },
  { timestamps: false }
);

export const ExpenseAudit = mongoose.model<IExpenseAudit>(
  "ExpenseAudit",
  expenseAuditSchema,
  "expense-audits"
);
