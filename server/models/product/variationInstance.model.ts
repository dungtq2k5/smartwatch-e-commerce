import mongoose from "mongoose";

const variationInstanceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    modelVariationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelVariation",
      required: true,
    },
    supplierSerialNumber: { // unique
      type: String,
      required: true,
    },
    supplierImeiNumber: { // unique
      type: String,
      required: false,
      default: null,
    },
    conditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstanceCondition",
      required: true,
    },
    isActive: {
      type: Boolean,
      required: false,
      default: true,
    },
    inactiveAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

variationInstanceSchema.index(
  { modelVariationId: 1, supplierSerialNumber: 1 },
  {
    unique: true,
  }
);

variationInstanceSchema.index(
  { modelVariationId: 1, supplierImeiNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { supplierImeiNumber: { $ne: true } },
  }
);

const VariationInstance = mongoose.model(
  "VariationInstance",
  variationInstanceSchema
);
export default VariationInstance;
