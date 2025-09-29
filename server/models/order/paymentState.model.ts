import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPaymentState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentStateSchema = new Schema(
  {
    lookupId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const PaymentState: Model<IPaymentState> = mongoose.model<IPaymentState>(
  "PaymentState",
  paymentStateSchema
);
export default PaymentState;
