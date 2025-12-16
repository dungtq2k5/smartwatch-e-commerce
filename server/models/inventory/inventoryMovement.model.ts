import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IInventoryMovement extends Document<Types.ObjectId> {
  variationInstanceId: Types.ObjectId;
  variationInstanceSku: string;
  inventoryMovementTypeId: Types.ObjectId;
  grnId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  movementDate: Date;
  quantity: 1 | -1; // 1 for addition, -1 for removal
  notes: string | null;
  createdAt: Date;
}

const inventoryMovementSchema: Schema<IInventoryMovement> = new Schema(
  {
    variationInstanceId: {
      type: Schema.Types.ObjectId,
      ref: "VariationInstance",
      required: true,
    },
    variationInstanceSku: {
      type: String,
      required: true,
    },
    inventoryMovementTypeId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryMovementType",
      required: true,
    },
    grnId: {
      type: Schema.Types.ObjectId,
      ref: "Grn",
      required: false,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movementDate: {
      type: Date,
      required: false,
      default: Date.now,
    },
    quantity: {
      type: Number,
      enum: [1, -1], // 1 for addition, -1 for removal
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const InventoryMovement: Model<IInventoryMovement> =
  mongoose.model<IInventoryMovement>(
    "InventoryMovement",
    inventoryMovementSchema
  );
export default InventoryMovement;
