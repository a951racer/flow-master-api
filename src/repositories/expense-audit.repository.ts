import { IExpenseAudit, IExpenseAuditChange, ExpenseAudit, ExpenseAuditAction } from "../models/expense-audit.model";

export async function create(
  expenseId: string,
  action: ExpenseAuditAction,
  changes: IExpenseAuditChange[] = []
): Promise<IExpenseAudit> {
  return ExpenseAudit.create({ expenseId, action, changedAt: new Date(), changes });
}

export async function findByExpenseId(expenseId: string): Promise<IExpenseAudit[]> {
  return ExpenseAudit.find({ expenseId }).sort({ changedAt: 1 });
}
