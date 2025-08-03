import mongoose from "mongoose";

const optSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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

const Otp = mongoose.model("Otp", optSchema);
export default Otp;
