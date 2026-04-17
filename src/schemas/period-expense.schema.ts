import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const periodExpenseSchema = z
  .object({
    period: objectIdSchema,
    expense: objectIdSchema,
    status: z.enum(["Unpaid", "Paid", "Deferred"]),
    overrideAmount: z.number().positive().optional(),
  })
  .strict();

export type PeriodExpenseInput = z.infer<typeof periodExpenseSchema>;
