import mongoose from "mongoose";

const refundStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const RefundStatus = mongoose.model("RefundStatus", refundStatusSchema);
export default RefundStatus;
