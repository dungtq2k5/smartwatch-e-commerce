import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { PRODUCT_TYPES } from "../../../common/configs.common";

export interface IProduct extends Document<Types.ObjectId> {
  name: string;
  type: (typeof PRODUCT_TYPES)[number];
  brandId: Types.ObjectId;
  categoryId: Types.ObjectId;
  description: string;
  imageUrls: string[];
  basePriceCents: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  stopSelling: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

const productSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    type: {
      type: String,
      required: true,
      enum: PRODUCT_TYPES,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "ProductBrand",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    imageUrls: {
      type: [String],
      required: false,
      default: [],
    },
    basePriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stopSelling: {
      type: Boolean,
      required: false,
      default: false,
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("brand", {
  ref: "ProductBrand",
  localField: "brandId",
  foreignField: "_id",
  justOne: true, // Single object expected, not an array
});

productSchema.virtual("category", {
  ref: "ProductCategory",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

const Product: Model<IProduct> = mongoose.model<IProduct>(
  "Product",
  productSchema
);
export default Product;
