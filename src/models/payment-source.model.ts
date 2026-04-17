import mongoose, { Document, Schema } from "mongoose";

export interface IPaymentSource extends Document {
  source: string;
}

const paymentSourceSchema = new Schema<IPaymentSource>(
  {
    source: { type: String, required: true, maxlength: 100 },
  },
  { timestamps: true }
);

export const PaymentSource = mongoose.model<IPaymentSource>(
  "PaymentSource",
  paymentSourceSchema,
  "payment-sources"
);
