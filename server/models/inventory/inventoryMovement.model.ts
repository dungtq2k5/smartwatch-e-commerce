import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    variationInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariationInstance",
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    movementTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryMovementType",
      required: true,
    },
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grn",
      required: false,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
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
  { timestamps: { createdAt: true } }
);

const InventoryMovement = mongoose.model(
  "InventoryMovement",
  inventoryMovementSchema
);
export default InventoryMovement;
