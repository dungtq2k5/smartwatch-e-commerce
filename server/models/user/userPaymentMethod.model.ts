import mongoose from "mongoose";

const userPaymentMethodSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stripePaymentMethodId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["card"],
      required: true,
    },
    card: {
      type: {
        brand: {
          type: String, // e.g., 'visa', 'mastercard'
          required: true,
        },
        last4: {
          type: String, // e.g., '4242'
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
      },
      required: true,
      _id: false,
    },
    isDefault: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: true }
);

userPaymentMethodSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

const UserPaymentMethod = mongoose.model(
  "UserPaymentMethod",
  userPaymentMethodSchema
);
export default UserPaymentMethod;
