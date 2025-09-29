import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICancelReason extends Document<Types.ObjectId> {
  name: string;
  description: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryStateSchema: Schema<ICancelReason> = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const CancelReason: Model<ICancelReason> = mongoose.model<ICancelReason>(
  "CancelReason",
  deliveryStateSchema
);
export default CancelReason;
