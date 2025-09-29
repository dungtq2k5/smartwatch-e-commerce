import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInstanceCondition extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const instanceConditionSchema: Schema<IInstanceCondition> = new Schema(
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

const InstanceCondition: Model<IInstanceCondition> =
  mongoose.model<IInstanceCondition>(
    "InstanceCondition",
    instanceConditionSchema
  );
export default InstanceCondition;
