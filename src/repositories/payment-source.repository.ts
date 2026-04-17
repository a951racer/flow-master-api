import { IPaymentSource, PaymentSource } from "../models/payment-source.model";
import { PaymentSourceInput } from "../schemas/payment-source.schema";

export async function findAll(): Promise<IPaymentSource[]> {
  return PaymentSource.find();
}

export async function findById(id: string): Promise<IPaymentSource | null> {
  return PaymentSource.findById(id);
}

export async function create(data: PaymentSourceInput): Promise<IPaymentSource> {
  return PaymentSource.create(data);
}

export async function update(id: string, data: PaymentSourceInput): Promise<IPaymentSource | null> {
  return PaymentSource.findByIdAndUpdate(id, data, { new: true });
}

export async function remove(id: string): Promise<boolean> {
  const result = await PaymentSource.findByIdAndDelete(id);
  return result !== null;
}
