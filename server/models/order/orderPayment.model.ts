import mongoose from "mongoose";

const OrderPaymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    methodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentStatus",
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    transactionDate: {
      type: Date,
      required: false,
      default: Date.now,
    },
    relatedTransactionId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const OrderPayment = mongoose.model("OrderPayment", OrderPaymentSchema);
export default OrderPayment;
