import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPasswordResetToken extends Document<Types.ObjectId> {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const passwordResetToken: Schema<IPasswordResetToken> = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.model<IPasswordResetToken>("PasswordResetToken", passwordResetToken);
export default PasswordResetToken;
