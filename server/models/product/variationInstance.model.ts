import mongoose from "mongoose";

const variationInstanceSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    variationTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variation",
      required: true,
    },
    supplierSerialNumber: {
      type: String,
      required: true,
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
    inactiveAt: {
      type: Date,
    },

    // Additional fields for type color
    supplierImeiNumber: {
      type: String,
    },
  },
  { timestamps: true }
);

variationInstanceSchema.index(
  { variationTypeId: 1, supplierSerialNumber: 1 },
  {
    unique: true,
  }
);

variationInstanceSchema.index(
  { variationTypeId: 1, supplierImeiNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { supplierImeiNumber: { $exists: true } },
  }
);

const VariationInstance = mongoose.model(
  "VariationInstance",
  variationInstanceSchema
);
export default VariationInstance;
