import mongoose from "mongoose";

const refundTransactionSchema = new mongoose.Schema(
  {
    returnOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnOrder",
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
    },
    methodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    externalRef: {
      type: String,
    },
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefundStatus",
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const RefundTransaction = mongoose.model(
  "RefundTransaction",
  refundTransactionSchema
);
export default RefundTransaction;
