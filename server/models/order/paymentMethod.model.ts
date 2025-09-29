import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPaymentMethod extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  description: string;
}

const paymentMethodSchema: Schema<IPaymentMethod> = new Schema({
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
});

const PaymentMethod: Model<IPaymentMethod> = mongoose.model<IPaymentMethod>(
  "PaymentMethod",
  paymentMethodSchema
);
export default PaymentMethod;
