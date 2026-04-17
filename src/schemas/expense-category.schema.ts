import { z } from "zod";

export const expenseCategorySchema = z
  .object({
    category: z
      .string()
      .min(1, "category is required")
      .max(100, "category must be at most 100 characters"),
  })
  .strict();

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
