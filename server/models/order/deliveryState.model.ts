import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IDeliveryState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  level: number;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryStateSchema: Schema<IDeliveryState> = new Schema(
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

const DeliveryState: Model<IDeliveryState> = mongoose.model<IDeliveryState>(
  "DeliveryState",
  deliveryStateSchema
);
export default DeliveryState;
