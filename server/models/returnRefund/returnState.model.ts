import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IReturnState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  level: number;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnStateSchema: Schema<IReturnState> = new Schema(
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

const ReturnState: Model<IReturnState> = mongoose.model<IReturnState>(
  "ReturnState",
  returnStateSchema
);
export default ReturnState;
