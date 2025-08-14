import mongoose from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";
import { getPaymentStatusId } from "../../utils/utils";

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
      required: false,
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

const orderPaymentSchema = new mongoose.Schema(
  {
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
    relatedTransactionId: {
      // unique
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
      required: false,
      default: null,
    },
    createdAt: {
      type: Date,
      required: false,
      default: Date.now,
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
      required: false,
      default: VN_COUNTRY_CODE,
    },
    location: {
      type: {
        locationType: {
          type: String,
          enum: ["point"],
          required: false,
          default: "point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
      required: true,
      _id: false,
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
      // Can be null when order is created (when user click checkout button) but not for COD
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryState",
      required: false,
      default: null,
    },
    orderDate: {
      // orderDate is the date when the order is paid for non-COD orders
      // and the date when the order is created for COD orders
      type: Date,
      required: false,
      default: null,
    },
    paymentStatusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentStatus",
      required: true,
    },
    estimateReceivedDate: {
      type: Date,
      required: true,
    },
    receivedDate: {
      type: Date,
      required: false,
      default: null,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    payment: {
      // Payment can be null when order is created or COD
      type: orderPaymentSchema,
      required: false,
      default: null,
    },
    paymentMethodId: {
      // If method is COD the payment field will be null
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
