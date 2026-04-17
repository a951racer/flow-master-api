import { z } from "zod";

export const incomeSchema = z
  .object({
    dayOfMonth: z.number().int().min(1).max(31),
    amount: z.number().positive(),
    source: z.string().min(1).max(100),
    isPaycheck: z.boolean(),
    inactive: z.boolean(),
    inactiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .refine(
    (data) => !data.inactiveDate || data.inactive === true,
    { message: "inactiveDate can only be set when inactive is true", path: ["inactiveDate"] }
  );

export type IncomeInput = z.infer<typeof incomeSchema>;
