import { z } from "zod";

export const periodSchema = z
  .object({
    startDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "startDate must be a valid ISO 8601 date (YYYY-MM-DD)"
      ),
  })
  .strict();

export type PeriodInput = z.infer<typeof periodSchema>;
