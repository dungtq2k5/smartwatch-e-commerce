import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IState } from "../order/order.model";
import { WITHDRAWAL_METHODS } from "../../../common/configs.common";
import { IUserBankAccount } from "../user/userBankAccount.model";

// --- INTERFACE ---
type TBankAccount = Pick<
  IUserBankAccount,
  "stripeConnectedAccountId" | "accountHolderName" | "last4" | "bankName"
>;
interface IBankAccount extends TBankAccount {}

export interface IWithdrawalRequest extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  amountCents: number;
  currency: string;
  states: IState[];
  withdrawalMethod: (typeof WITHDRAWAL_METHODS)[number];
  stripeTransferGroupId: string | null; // For grouping related transfers in Stripe
  stripeTransferId: string | null; // The actual transfer ID from Stripe
  bankAccount: IBankAccount;
  failureReason: string | null; // Store failure details
  processedAt: Date | null; // When the withdrawal was actually processed
  createdAt: Date;
  updatedAt: Date;
}

// --- SCHEMA ---
const withdrawalStatesSchema: Schema<IState> = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: "WithdrawalState",
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

const withdrawalBankAccountSchema: Schema<IBankAccount> = new Schema(
  {
    stripeConnectedAccountId: {
      type: String,
      required: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    last4: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const withdrawalRequestSchema: Schema<IWithdrawalRequest> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    states: {
      type: [withdrawalStatesSchema],
      required: true,
    },
    withdrawalMethod: {
      type: String,
      enum: WITHDRAWAL_METHODS,
      required: true,
    },
    stripeTransferGroupId: {
      type: String,
      required: false,
      default: null,
    },
    stripeTransferId: {
      type: String,
      required: false,
      default: null,
    },
    bankAccount: {
      type: withdrawalBankAccountSchema,
      required: true,
    },
    failureReason: {
      type: String,
      required: false,
      default: null,
    },
    processedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const WithdrawalRequest: Model<IWithdrawalRequest> =
  mongoose.model<IWithdrawalRequest>(
    "WithdrawalRequest",
    withdrawalRequestSchema
  );
export default WithdrawalRequest;
