import mongoose from "mongoose";

const productVariationSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    watchSizeMm: {
      type: Number,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
      min: 0,
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    basePriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    displaySizeMm: {
      type: Number,
      required: true,
      min: 0,
    },
    displayType: {
      type: String,
      required: true,
    },
    resolutionHPx: {
      type: Number,
      required: true,
      min: 0,
    },
    resolutionWPx: {
      type: Number,
      required: true,
      min: 0,
    },
    ramBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    romBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    osId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductOs",
      required: true,
    },
    connectivity: {
      type: [String],
      required: true,
    },
    batteryLifeMah: {
      type: Number,
      required: true,
      min: 0,
    },
    waterResistanceValue: {
      type: Number,
      required: true,
      min: 0,
    },
    waterResistanceUnit: {
      type: String,
      required: true,
    },
    sensor: {
      type: [String],
      required: true,
    },
    caseMaterial: {
      type: String,
      required: true,
    },
    weightMg: {
      type: Number,
      required: true,
      min: 0,
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stopSelling: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ProductVariation = mongoose.model(
  "ProductVariation",
  productVariationSchema
);
export default ProductVariation;
