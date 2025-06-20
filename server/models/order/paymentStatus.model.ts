import mongoose from "mongoose";

const paymentStatusSchema = new mongoose.Schema({
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

const PaymentStatus = mongoose.model("PaymentStatus", paymentStatusSchema);
export default PaymentStatus;