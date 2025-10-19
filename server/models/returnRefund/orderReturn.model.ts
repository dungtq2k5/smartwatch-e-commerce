import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  deliveryAddressSchema,
  IDeliveryAddress,
  IState,
} from "../order/order.model";

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
}

export interface IReturnItem {
  variationId: Types.ObjectId;
  quantity: number;
  totalCents: number;
  instances: IVariationInstance[];
}

export interface IRefundSummary {
  toCardCents: number;
  toBalanceCents: number;
  finalRefundAmountCents: number;
}

export interface IRefundTransaction {
  amountCents: number;
  currency: string;
  transactionDate: Date;
  paymentIntentId: string | null;
  createdAt?: Date; // Make this optional for not specify when creating
}

export interface IOrderReturn extends Document<Types.ObjectId> {
  orderId: Types.ObjectId;
  items: IReturnItem[];
  pickupAddress: IDeliveryAddress;
  refundTransaction: IRefundTransaction | null;
  refundSummary: IRefundSummary;
  refundStates: IState[];
  pickupStates: IState[];
  states: IState[];
  pickupDate: Date | null;
  estimatePickupDate: Date;
  reasonId: Types.ObjectId;
  imageUrls: string[];
  buyerReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// --- SCHEMAS & MODELS ---
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
  },
  { _id: false }
);

const returnItemSchema: Schema<IReturnItem> = new Schema(
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
  { _id: false }
);

returnItemSchema.virtual("variation", {
  ref: "ModelVariation",
  localField: "variationId",
  foreignField: "_id",
  justOne: true,
});

const refundStateSchema: Schema<IState> = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "RefundState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
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

const returnStateSchema: Schema<IState> = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "ReturnState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
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

const refundSummarySchema: Schema<IRefundSummary> = new Schema(
  {
    toCardCents: {
      type: Number,
      required: true,
      min: 0,
    },
    toBalanceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    finalRefundAmountCents: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const pickupStateSchema: Schema<IState> = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "PickupState",
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
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

const pickupAddressSchema = deliveryAddressSchema;

const refundTransactionSchema: Schema<IRefundTransaction> = new Schema(
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

const orderReturnSchema: Schema<IOrderReturn> = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    items: {
      type: [returnItemSchema],
      required: true,
    },
    pickupAddress: {
      type: pickupAddressSchema,
      required: true,
    },
    refundTransaction: {
      // Only for refundSummary.toCardCents > 0
      type: refundTransactionSchema,
      required: false,
      default: null,
    },
    refundSummary: {
      type: refundSummarySchema,
      required: true,
    },
    refundStates: {
      type: [refundStateSchema],
      required: true,
    },
    pickupStates: {
      type: [pickupStateSchema],
      required: true,
    },
    states: {
      type: [returnStateSchema],
      required: true,
    },
    pickupDate: {
      type: Date,
      required: false,
      default: null,
    },
    estimatePickupDate: {
      type: Date,
      required: true,
    },
    reasonId: {
      type: Schema.Types.ObjectId,
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

const OrderReturn: Model<IOrderReturn> = mongoose.model<IOrderReturn>(
  "OrderReturn",
  orderReturnSchema
);
export default OrderReturn;
