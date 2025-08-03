import mongoose from "mongoose";

const passwordResetToken = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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
  { timestamps: { createdAt: true } }
);

const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  passwordResetToken
);
export default PasswordResetToken;
