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
      unique: true,
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
    },
  },
  { timestamps: true }
);

const VariationBandInstance = mongoose.model(
  "VariationBandInstance",
  VariationBandInstanceSchema
);
export default VariationBandInstance;
