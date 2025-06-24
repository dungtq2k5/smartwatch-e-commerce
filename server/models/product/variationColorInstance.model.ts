import mongoose from "mongoose";

const VariationColorInstanceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    variationColorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariationColor",
      required: true,
    },
    supplierSerialNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplierImeiNumber: {
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

const VariationColorInstance = mongoose.model(
  "VariationColorInstance",
  VariationColorInstanceSchema
);
export default VariationColorInstance;
