import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IUserPaymentMethod extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  stripePaymentMethodId: string;
  type: "card";
  card: {
    brand: string; // e.g., 'visa', 'mastercard'
    last4: string; // e.g., '4242'
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userPaymentMethodSchema: Schema<IUserPaymentMethod> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
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

const UserPaymentMethod: Model<IUserPaymentMethod> =
  mongoose.model<IUserPaymentMethod>(
    "UserPaymentMethod",
    userPaymentMethodSchema
  );
export default UserPaymentMethod;
