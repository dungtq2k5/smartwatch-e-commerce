import mongoose from "mongoose";

const productModelSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    watchSizeMm: {
      type: Number,
      required: true,
      min: 0,
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    stockPriceCents: {
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
    connectivities: {
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
    sensors: {
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
      default: Date.now,
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

productModelSchema.index(
  { productId: 1, model: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

productModelSchema.index(
  { productId: 1, watchSizeMm: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

const ProductModel = mongoose.model("ProductModel", productModelSchema);
export default ProductModel;
