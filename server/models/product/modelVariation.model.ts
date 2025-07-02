import mongoose from "mongoose";

const modelVariationSchema = new mongoose.Schema(
  {
    productModelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductModel",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["color", "band"],
    },
    name: {
      type: String,
      required: true,
    },
    colorHex: {
      type: String,
      required: true,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    stockQuantity: {
      type: Number,
      default: 0,
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
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Additional fields for color variations
    additionalPriceCents: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Additional fields for band variations
    material: {
      type: String,
    },
    sizeMm: {
      type: Number,
      min: 0,
    },
    weightMg: {
      type: Number,
      min: 0,
    },
    priceCents: {
      type: Number,
      min: 0,
    },
    basePriceCents: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

modelVariationSchema.index(
  { productModelId: 1, type: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

modelVariationSchema.index(
  { productModelId: 1, type: 1, colorHex: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

modelVariationSchema.pre("save", function (next) {
  if (this.isModified("stockQuantity") && !this.isNew) {
    const modifiedPaths = this.modifiedPaths();
    if (modifiedPaths.length === 1 && modifiedPaths[0] === "stockQuantity") {
      this.set("updatedAt", this.get("updatedAt", null, { prior: true }));
    }
  }
  next();
});

const ModelVariation = mongoose.model("ModelVariation", modelVariationSchema);
export default ModelVariation;
