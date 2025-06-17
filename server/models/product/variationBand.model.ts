import mongoose from "mongoose";

const VariationBandSchema = new mongoose.Schema(
  {
    productVariationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariation",
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: {
        unique: true,
        partialFilterExpression: { isDeleted: false },
      },
    },
    colorHex: {
      type: String,
      required: true,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    material: {
      type: String,
      required: true,
    },
    sizeMm: {
      type: Number,
      required: true,
    },
    weightMg: {
      type: Number,
      required: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    basePriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stopSelling: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true } // TODO not trigger when stock quantity changes
);

const VariationBand = mongoose.model("VariationBand", VariationBandSchema);
export default VariationBand;
