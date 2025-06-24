import mongoose from "mongoose";

const userPaymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    cardBrand: {
      type: String,
      required: true,
    },
    lastFourDigits: {
      type: String,
      required: true,
    },
    expMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    expYear: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: {
        unique: true,
        partialFilterExpression: { isDefault: true },
      },
    },
  },
  { timestamps: true }
);

const UserPaymentMethod = mongoose.model("UserPaymentMethod", userPaymentMethodSchema);
export default UserPaymentMethod;