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
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { supplierImeiNumber: { $type: "String" } },
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

const VariationColorInstance = mongoose.model(
  "VariationColorInstance",
  VariationColorInstanceSchema
);
export default VariationColorInstance;
