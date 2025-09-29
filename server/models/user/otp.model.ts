import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IOtp extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  type: "email" | "phoneNumber";
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const optSchema: Schema<IOtp> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["email", "phoneNumber"],
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isUsed: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: true }
);

const Otp: Model<IOtp> = mongoose.model<IOtp>("Otp", optSchema);
export default Otp;
