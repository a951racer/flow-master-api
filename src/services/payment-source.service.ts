import * as paymentSourceRepository from "../repositories/payment-source.repository";
import { IPaymentSource } from "../models/payment-source.model";
import { PaymentSourceInput } from "../schemas/payment-source.schema";
import { AppError } from "../utils/app-error";

export async function findAll(): Promise<IPaymentSource[]> {
  return paymentSourceRepository.findAll();
}

export async function findById(id: string): Promise<IPaymentSource> {
  const source = await paymentSourceRepository.findById(id);
  if (!source) throw new AppError(404, "PaymentSource not found");
  return source;
}

export async function create(data: PaymentSourceInput): Promise<IPaymentSource> {
  return paymentSourceRepository.create(data);
}

export async function update(id: string, data: PaymentSourceInput): Promise<IPaymentSource> {
  const source = await paymentSourceRepository.update(id, data);
  if (!source) throw new AppError(404, "PaymentSource not found");
  return source;
}

export async function remove(id: string): Promise<void> {
  const deleted = await paymentSourceRepository.remove(id);
  if (!deleted) throw new AppError(404, "PaymentSource not found");
}
