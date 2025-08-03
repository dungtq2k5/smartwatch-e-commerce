import mongoose from "mongoose";

const inventoryMovementTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: false,
    default: null,
  },
});

const InventoryMovementType = mongoose.model(
  "InventoryMovementType",
  inventoryMovementTypeSchema
);
export default InventoryMovementType;
