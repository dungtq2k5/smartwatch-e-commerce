import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICart extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
  variationId: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema: Schema<ICart> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    variationId: {
      type: Schema.Types.ObjectId,
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

const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
export default Cart;
