import mongoose from "mongoose";

const modelVariationSchema = new mongoose.Schema(
  {
    productModelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductModel",
      required: true,
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
    additionalPriceCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    band: {
      type: {
        lugWidthMm: {
          type: Number,
          required: true,
          min: 0,
        },
        material: {
          type: String,
          required: true,
        },
        colorsHex: {
          type: [String],
          required: true,
        },
        claspType: {
          type: String,
          required: true,
        },
        adjustableRangeMm: {
          type: {
            min: {
              type: Number,
              required: true,
              min: 0,
            },
            max: {
              type: Number,
              required: true,
              min: 0,
            },
          },
          required: true,
        },
        style: {
          type: String,
          required: true,
        },
        quickRelease: {
          type: Boolean,
          default: false,
        },
        waterResistance: {
          type: Boolean,
          default: false,
        },
        hypoallergenic: {
          type: Boolean,
          default: false,
        },
        weightMg: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      required: true,
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
  },
  { timestamps: true }
);

modelVariationSchema.index(
  { productModelId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

modelVariationSchema.index(
  { productModelId: 1, colorHex: 1 },
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
