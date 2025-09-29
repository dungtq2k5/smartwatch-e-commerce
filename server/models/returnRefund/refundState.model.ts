import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IRefundState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const refundStateSchema: Schema<IRefundState> = new Schema(
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

const RefundState: Model<IRefundState> = mongoose.model<IRefundState>(
  "RefundState",
  refundStateSchema
);
export default RefundState;
