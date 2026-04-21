import { IIncomeAudit, IIncomeAuditChange, IncomeAudit, IncomeAuditAction } from "../models/income-audit.model";

export async function create(
  incomeId: string,
  action: IncomeAuditAction,
  changes: IIncomeAuditChange[] = []
): Promise<IIncomeAudit> {
  return IncomeAudit.create({ incomeId, action, changedAt: new Date(), changes });
}

export async function findByIncomeId(incomeId: string): Promise<IIncomeAudit[]> {
  return IncomeAudit.find({ incomeId }).sort({ changedAt: 1 });
}
