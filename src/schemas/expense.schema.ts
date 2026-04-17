import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const expenseSchema = z
  .object({
    dayOfMonth: z.number().int().min(1).max(31),
    amount: z.number().positive(),
    type: z.enum(["expense", "debt", "bill"]),
    payee: z.string().min(1),
    payeeUrl: z.string().url().optional(),
    required: z.boolean(),
    category: objectIdSchema,
    paymentSource: objectIdSchema,
    inactive: z.boolean(),
    inactiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .refine(
    (data) => !data.inactiveDate || data.inactive === true,
    { message: "inactiveDate can only be set when inactive is true", path: ["inactiveDate"] }
  );

export type ExpenseInput = z.infer<typeof expenseSchema>;
