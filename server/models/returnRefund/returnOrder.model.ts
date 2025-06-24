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
      required: true,
      ref: "onModel",
    },
    onModel: {
      type: String,
      required: true,
      enum: ["VariationColorInstance", "VariationBandInstance"],
    },
    instanceSku: {
      type: String,
      required: true,
    },
    refundCents: {
      type: Number,
      required: true,
      min: 0,
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
      required: true,
      min: 0,
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
      default: [],
    },
    buyerReason: {
      type: String,
    },
  },
  { timestamps: true }
);

const ReturnOrder = mongoose.model("ReturnOrder", returnOrderSchema);
export default ReturnOrder;
