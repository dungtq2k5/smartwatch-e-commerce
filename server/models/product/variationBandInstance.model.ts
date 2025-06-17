import mongoose from "mongoose";

const VariationBandInstanceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    variationBandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariationBand",
      required: true,
    },
    supplierSerialNumber: {
      type: String,
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { supplierSerialNumber: { $type: "string" } },
      },
    },
    conditionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstanceCondition",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inActivateAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const VariationBandInstance = mongoose.model(
  "VariationBandInstance",
  VariationBandInstanceSchema
);
export default VariationBandInstance;
