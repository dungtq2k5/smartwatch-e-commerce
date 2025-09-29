import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IVariationInstance extends Document<Types.ObjectId> {
  sku: string;
  modelVariationId: Types.ObjectId;
  supplierSerialNumber: string;
  supplierImeiNumber: string | null;
  conditionId: Types.ObjectId;
  isActive: boolean;
  inactiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const variationInstanceSchema: Schema<IVariationInstance> = new Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    modelVariationId: {
      type: Schema.Types.ObjectId,
      ref: "ModelVariation",
      required: true,
    },
    supplierSerialNumber: {
      // unique
      type: String,
      required: true,
    },
    supplierImeiNumber: {
      // unique
      type: String,
      required: false,
      default: null,
    },
    conditionId: {
      type: Schema.Types.ObjectId,
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

const VariationInstance: Model<IVariationInstance> =
  mongoose.model<IVariationInstance>(
    "VariationInstance",
    variationInstanceSchema
  );
export default VariationInstance;
