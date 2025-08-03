import mongoose from "mongoose";

/**
items: [
  {
    instanceId: ObjectId,
    instanceSku: String,
    refundCents: Number,
  },
  ...
]
 */

const returnOrderItemSchema = new mongoose.Schema(
  {
    variationInstanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariationInstance",
      required: true,
    },
    instanceSku: {
      type: String,
      required: true,
    },
    refundCents: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { _id: false }
);

const returnOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    items: {
      type: [returnOrderItemSchema],
      required: true,
    },
    refundTotalCents: {
      type: Number,
      min: 0,
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
    },
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnStatus",
      required: true,
    },
    reasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnReason",
      required: true,
    },
    imageUrls: {
      type: [String],
      required: false,
      default: [],
    },
    buyerReason: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const ReturnOrder = mongoose.model("ReturnOrder", returnOrderSchema);
export default ReturnOrder;
