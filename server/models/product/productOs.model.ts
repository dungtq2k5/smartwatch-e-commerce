import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProductOs extends Document<Types.ObjectId> {
  name: string;
  logoUrl: string | null;
  description: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

const productOsSchema: Schema<IProductOs> = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    logoUrl: {
      type: String,
      required: false,
      default: null,
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

const ProductOs: Model<IProductOs> = mongoose.model<IProductOs>(
  "ProductOs",
  productOsSchema
);
export default ProductOs;
