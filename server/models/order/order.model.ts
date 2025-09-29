import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";
import {
  ORDER_VARIATION_INSTANCE_STATES,
  RETURN_POLICY_DAYS,
} from "../../configs/configs";
import { IUserAddress } from "../user/userAddress.model";

/**
items: [
  {
    variationId: ObjectId,
    quantity: Number,
    totalCents: Number,
    instances: [
      {
        id: ObjectId,
        sku: String,
        state: String,
      },
      ...
    ],
  },
  ...
]
 */

// --- INTERFACES ---
export interface IVariationInstance {
  id: Types.ObjectId;
  sku: string;
  state: (typeof ORDER_VARIATION_INSTANCE_STATES)[number]["name"];
}

export interface IOrderItem {
  variationId: Types.ObjectId;
  quantity: number;
  totalCents: number;
  instances: IVariationInstance[];
}

type TDeliveryAddress = Omit<
  IUserAddress,
  keyof Document | "userId" | "isDefault" | "createdAt" | "updatedAt"
>;
export interface IDeliveryAddress extends TDeliveryAddress {};

export interface ITransaction {
  amountCents: number;
  currency: string;
  transactionDate: Date;
  paymentIntentId: string | null;
  createdAt?: Date; // Make this optional for not specify when creating
}

export interface IPaymentSummary {
  subtotalCents: number;
  appliedBalanceCents: number;
  finalAmountCents: number;
}

export interface IState {
  id: Types.ObjectId;
  notes: string | null;
  createdBy: Types.ObjectId;
  createdAt?: Date; // Make this optional for not specify when pushing
}

export interface IOrder extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: IDeliveryAddress;
  transaction: ITransaction | null;
  paymentSummary: IPaymentSummary;
  paymentMethodId: Types.ObjectId;
  paymentStates: IState[];
  deliveryStates: IState[];
  states: IState[];
  orderDate: Date | null;
  estimateReceivedDate: Date;
  receivedDate: Date | null;
  fulfilledBy: Types.ObjectId | null; // User who fulfilled the order, null if not fulfilled yet
  fulfilledAt: Date | null; // Date when the order was fulfilled, null if not fulfilled yet
  buyerCancelReasonId: Types.ObjectId | null;
  canReturn: boolean; // Virtual field, not stored in DB
  createdAt: Date;
  updatedAt: Date;
}

// --- SUB-SCHEMAS ---
const variationInstanceSchema: Schema<IVariationInstance> = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "VariationInstance",
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: false,
      enum: ORDER_VARIATION_INSTANCE_STATES.map((state) => state.name),
      default: "ordered",
    },
  },
  { _id: false }
);

const orderItemSchema: Schema<IOrderItem> = new Schema(
  {
    variationId: {
      type: Schema.Types.ObjectId,
      ref: "ModelVariation",
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
    instances: {
      type: [variationInstanceSchema],
      required: true,
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderItemSchema.virtual("variation", {
  ref: "ModelVariation",
  localField: "variationId",
  foreignField: "_id",
  justOne: true,
});

export const deliveryAddressSchema: Schema<IDeliveryAddress> = new Schema(
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
          required: true,
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

const transactionSchema: Schema<ITransaction> = new Schema(
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
    paymentIntentId: {
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

const paymentSummarySchema: Schema<IPaymentSummary> = new Schema(
  {
    subtotalCents: {
      type: Number,
      required: true,
      min: 0,
    },
    appliedBalanceCents: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    finalAmountCents: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const paymentStateSchema: Schema<IState> = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  { _id: false }
);

const deliveryState: Schema<IState> = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderState: Schema<IState> = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  { _id: false }
);

// --- MAIN SCHEMA & MODEL ---
const orderSchema: Schema<IOrder> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    transaction: {
      // Transaction can be null when order is created or COD
      type: transactionSchema,
      required: false,
      default: null,
    },
    paymentSummary: {
      type: paymentSummarySchema,
      required: true,
    },
    paymentMethodId: {
      // If method is COD the transaction field will be null
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    paymentStates: {
      type: [paymentStateSchema],
      required: true,
    },
    deliveryStates: {
      type: [deliveryState],
      required: true,
    },
    states: {
      type: [orderState],
      required: true,
    },
    orderDate: {
      // orderDate is the date when the order is paid for non-COD orders and the date when the order is created for COD orders
      type: Date,
      required: false,
      default: null,
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
    fulfilledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      required: false,
      default: null,
    },
    buyerCancelReasonId: {
      type: Schema.Types.ObjectId,
      ref: "OrderCancelReason",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.virtual("canReturn").get(function (this: IOrder) {
  // The order must have been received to be returnable
  if (!this.receivedDate) return false;

  // Calculate the return deadline
  const deadline = new Date(this.receivedDate);
  deadline.setDate(deadline.getDate() + RETURN_POLICY_DAYS);

  return new Date() < deadline;
});

const Order: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
