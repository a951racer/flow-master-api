import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const periodIncomeEntrySchema = z.object({
  income: objectIdSchema,
  status: z.enum(["Pending", "Received"]),
  overrideAmount: z.number().positive().optional(),
});

export const periodExpenseEntrySchema = z.object({
  expense: objectIdSchema,
  status: z.enum(["Unpaid", "Paid", "Deferred"]),
  overrideAmount: z.number().positive().optional(),
});

export const periodSchema = z
  .object({
    startDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "startDate must be a valid ISO 8601 date (YYYY-MM-DD)"
      ),
    endDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "endDate must be a valid ISO 8601 date (YYYY-MM-DD)"
      ),
    incomes: z.array(periodIncomeEntrySchema).optional(),
    expenses: z.array(periodExpenseEntrySchema).optional(),
  })
  .strict()
  .refine((data) => data.endDate > data.startDate, {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export type PeriodIncomeEntryInput = z.infer<typeof periodIncomeEntrySchema>;
export type PeriodExpenseEntryInput = z.infer<typeof periodExpenseEntrySchema>;
export type PeriodInput = z.infer<typeof periodSchema>;
