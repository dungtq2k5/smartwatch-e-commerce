import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    variationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelVariation",
      required: true,
    },
    quantity: {
      type: Number,
      required: false,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual for variation population
cartSchema.virtual("variation", {
  ref: "ModelVariation",
  localField: "variationId",
  foreignField: "_id",
  justOne: true,
});

// Add compound indexes for better performance
cartSchema.index({ userId: 1, variationId: 1 }, { unique: true });
cartSchema.index({ userId: 1, createdAt: -1 });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
