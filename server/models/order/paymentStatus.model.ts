import mongoose from "mongoose";

const paymentStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const PaymentStatus = mongoose.model("PaymentStatus", paymentStatusSchema);
export default PaymentStatus;