import mongoose, { Document, Schema, Types } from "mongoose";

export type IncomeAuditAction = "created" | "updated" | "deleted";

export interface IIncomeAuditChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface IIncomeAudit extends Document {
  incomeId: Types.ObjectId;
  action: IncomeAuditAction;
  changedAt: Date;
  changes: IIncomeAuditChange[];
}

const incomeAuditChangeSchema = new Schema<IIncomeAuditChange>(
  {
    field: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const incomeAuditSchema = new Schema<IIncomeAudit>(
  {
    incomeId: { type: Schema.Types.ObjectId, ref: "Income", required: true },
    action: { type: String, required: true, enum: ["created", "updated", "deleted"] },
    changedAt: { type: Date, required: true, default: () => new Date() },
    changes: { type: [incomeAuditChangeSchema], default: [] },
  },
  { timestamps: false }
);

export const IncomeAudit = mongoose.model<IIncomeAudit>(
  "IncomeAudit",
  incomeAuditSchema,
  "income-audits"
);
