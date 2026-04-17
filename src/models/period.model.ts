import mongoose, { Document, Schema } from "mongoose";

export interface IPeriod extends Document {
  startDate: string;
}

const periodSchema = new Schema<IPeriod>(
  {
    startDate: { type: String, required: true },
  },
  { timestamps: true }
);

export const Period = mongoose.model<IPeriod>("Period", periodSchema);
