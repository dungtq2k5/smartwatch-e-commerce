import mongoose from "mongoose";

const deliveryStateSchema = new mongoose.Schema({
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
});

const DeliveryState = mongoose.model("DeliveryState", deliveryStateSchema);
export default DeliveryState;