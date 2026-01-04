import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProvider extends Document<Types.ObjectId> {
  fullName: string;
  email: string;
  phoneNumber: string;
  createdBy: Types.ObjectId;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const providerSchema: Schema<IProvider> = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    email: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    phoneNumber: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

providerSchema.virtual("addresses", {
  ref: "ProviderAddress",
  localField: "_id",
  foreignField: "providerId",
});

const Provider: Model<IProvider> = mongoose.model<IProvider>(
  "Provider",
  providerSchema
);
export default Provider;
