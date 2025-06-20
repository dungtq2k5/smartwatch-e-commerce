import mongoose from "mongoose";

const inventoryMovementTypeSchema = new mongoose.Schema({
  lookupId: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: "",
  },
});

const InventoryMovementType = mongoose.model(
  "InventoryMovementType",
  inventoryMovementTypeSchema
);
export default InventoryMovementType;
