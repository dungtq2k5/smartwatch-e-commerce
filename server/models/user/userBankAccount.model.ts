import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  BANK_ACCOUNT_TYPES,
  STRIPE_BANK_ACCOUNT_STATUS,
} from "../../../common/configs.common";

export interface IUserBankAccount extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  stripeConnectedAccountId: string; // Stripe Express/Standard account ID
  stripeBankAccountFingerprint: string | null; // Prevent adding duplicate bank accounts
  accountHolderName: string;
  last4: string;
  bankName: string;
  routingNumber: string | null; // For US banks
  accountType: (typeof BANK_ACCOUNT_TYPES)[number];
  currency: string;
  country: string;
  isVerified: boolean; // Whether Stripe has verified this account
  isDefault: boolean;
  accountStatus: (typeof STRIPE_BANK_ACCOUNT_STATUS)[number]; // Stripe account status
  requiresAction: boolean; // If user needs to complete onboarding
  createdAt: Date;
  updatedAt: Date;
}

const userBankAccountSchema: Schema<IUserBankAccount> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripeConnectedAccountId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeBankAccountFingerprint: {
      type: String,
      required: false,
      default: null,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    last4: {
      type: String,
      required: true,
      length: 4,
    },
    bankName: {
      type: String,
      required: true,
    },
    routingNumber: {
      type: String,
      required: false,
      default: null,
    },
    accountType: {
      type: String,
      enum: BANK_ACCOUNT_TYPES,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    isDefault: {
      type: Boolean,
      required: false,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: STRIPE_BANK_ACCOUNT_STATUS,
      required: true,
      default: "pending",
    },
    requiresAction: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: true }
);

userBankAccountSchema.index(
  { userId: 1, stripeBankAccountFingerprint: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripeBankAccountFingerprint: { $type: "string" },
    },
  }
);

userBankAccountSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

const UserBankAccount: Model<IUserBankAccount> =
  mongoose.model<IUserBankAccount>("UserBankAccount", userBankAccountSchema);
export default UserBankAccount;
