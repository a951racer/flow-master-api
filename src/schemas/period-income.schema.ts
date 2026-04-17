import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const periodIncomeSchema = z
  .object({
    period: objectIdSchema,
    income: objectIdSchema,
    status: z.enum(["Pending", "Received"]),
    overrideAmount: z.number().positive().optional(),
  })
  .strict();

export type PeriodIncomeInput = z.infer<typeof periodIncomeSchema>;
