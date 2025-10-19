import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IWithdrawalState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  level: number;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalStateSchema: Schema<IWithdrawalState> = new Schema(
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

const WithdrawalState: Model<IWithdrawalState> =
  mongoose.model<IWithdrawalState>("WithdrawalState", withdrawalStateSchema);
export default WithdrawalState;
