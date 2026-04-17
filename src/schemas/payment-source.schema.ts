import { z } from "zod";

export const paymentSourceSchema = z
  .object({
    source: z
      .string()
      .min(1, "source is required")
      .max(100, "source must be at most 100 characters"),
  })
  .strict();

export type PaymentSourceInput = z.infer<typeof paymentSourceSchema>;
