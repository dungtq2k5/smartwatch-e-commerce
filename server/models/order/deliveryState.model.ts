import mongoose from "mongoose";

const deliveryStateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  level: {
    type: Number,
    required: true,
  }
});

const DeliveryState = mongoose.model("DeliveryState", deliveryStateSchema);
export default DeliveryState;