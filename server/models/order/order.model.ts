import mongoose from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";

/**
items: [
  {
    variationId: ObjectId,
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

const orderItemSchema = new mongoose.Schema(
  {
    variationId: {
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

const deliveryAddressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    apartmentNumber: {
      type: String,
      required: true,
    },
    wardCode: {
      type: String,
      required: true,
    },
    districtCode: {
      type: String,
      required: true,
    },
    cityProvinceCode: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      default: VN_COUNTRY_CODE,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    fullAddress: {
      type: String,
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
      required: true,
    },
    receivedDate: {
      type: Date,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
