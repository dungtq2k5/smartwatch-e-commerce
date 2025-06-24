import mongoose from "mongoose";

/**
items: [
  {
    productVariationId: ObjectId,
    totalCents: Number,
    variations: [
      {
        variationId: ObjectId, // reference to VariationColor or VariationBand
        quantity: Number,
        totalCents: Number,
        instanceIds: [
          {
            instanceId: ObjectId, // reference to VariationColorInstance or VariationBandInstance
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

const instanceRefSchema = new mongoose.Schema(
  {
    instanceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "onModel",
    },
    onModel: {
      type: String,
      required: true,
      enum: ["VariationColorInstance", "VariationBandInstance"],
    },
    sku: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const variationRefSchema = new mongoose.Schema(
  {
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "onModel",
    },
    onModel: {
      type: String,
      required: true,
      enum: ["VariationColor", "VariationBand"],
    },
  },
  { _id: false }
);

const variationSchema = new mongoose.Schema(
  {
    variationId: {
      type: variationRefSchema,
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
      type: [instanceRefSchema],
      required: true,
    },
  },
  { _id: false }
);

const orderItemsSchema = new mongoose.Schema(
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
      type: [orderItemsSchema],
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
