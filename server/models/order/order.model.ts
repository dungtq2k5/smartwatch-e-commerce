import mongoose from "mongoose";

/**
items: [
  {
    productVariationId: ObjectId,
    totalCents: Number,
    variations: [
      {
        id: ObjectId,
        quantity: Number,
        totalCents: Number,
        instanceIds: [
          {
            id: ObjectId,
            sku: String,
          },
          ...
        ],
      },
      ...
    ],
  },
  ...
]
 */

const variationInstanceSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VariationInstance",
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "variation",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    instanceIds: {
      type: [variationInstanceSchema],
      required: true,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productVariationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: true,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    variations: {
      type: [variationSchema],
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryStateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryState",
      required: true,
    },
    estimateReceivedDate: {
      type: Date,
      default: Date.now,
    },
    receivedDate: {
      type: Date,
    },
    deliveryName: {
      type: String,
      required: true,
    },
    deliveryStreet: {
      type: String,
      required: true,
    },
    deliveryApartmentNumber: {
      type: String,
      required: true,
    },
    deliveryWard: {
      type: String,
      required: true,
    },
    deliveryDistrict: {
      type: String,
      required: true,
    },
    deliveryCityProvince: {
      type: String,
      required: true,
    },
    deliveryPhoneNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
