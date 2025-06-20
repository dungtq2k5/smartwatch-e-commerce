import mongoose from "mongoose";

const userAddress = new mongoose.Schema(
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
    ward: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    cityProvince: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: "Vietnam",
    },
    phoneNumber: {
      type: String,
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
  { timestamps: true, _id: false }
);

const userPaymentMethod = new mongoose.Schema(
  {
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
  { timestamps: true, _id: false }
);

const userRole = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    email: {
      // Can be null if phoneNumber is provided
      type: String,
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      }
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      // Can be null if email is provided
      type: String,
      default: null,
      index: {
        unique: true,
        partialFilterExpression: { phoneNumber: { $type: "string" } },
      }
    },
    isPhoneNumberVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    userBalanceCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    addresses: {
      type: [userAddress],
      default: [],
    },
    paymentMethods: {
      type: [userPaymentMethod],
      default: [],
    },
    roles: {
      type: [userRole],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
