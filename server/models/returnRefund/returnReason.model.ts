import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IReturnReason extends Document<Types.ObjectId> {
  name: string;
  description: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnReasonSchema: Schema<IReturnReason> = new Schema(
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

const ReturnReason: Model<IReturnReason> = mongoose.model<IReturnReason>(
  "ReturnReason",
  returnReasonSchema
);
export default ReturnReason;
