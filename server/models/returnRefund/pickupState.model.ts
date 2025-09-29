import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPickupState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  level: number;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pickupStateSchema: Schema<IPickupState> = new Schema(
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

export const PickupState: Model<IPickupState> = mongoose.model<IPickupState>(
  "PickupState",
  pickupStateSchema
);
export default PickupState;
