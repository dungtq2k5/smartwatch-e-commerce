import mongoose from "mongoose";
import { PRODUCT_TYPES } from "../../../common/configs.common";

const productSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductBrand",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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

const Product = mongoose.model("Product", productSchema);
export default Product;
