import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IOrderState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  level: number;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderStateSchema: Schema<IOrderState> = new Schema(
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
    level: {
      type: Number,
      required: true,
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

const OrderState: Model<IOrderState> = mongoose.model<IOrderState>(
  "OrderState",
  orderStateSchema
);
export default OrderState;
