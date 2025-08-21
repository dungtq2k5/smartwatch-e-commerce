import mongoose from "mongoose";

const variationBandSchema = new mongoose.Schema(
  {
    widthMm: {
      type: Number,
      required: true,
      min: 0,
    },
    lugWidthMm: {
      type: Number,
      required: true,
      min: 0,
    },
    material: {
      type: String,
      required: true,
    },
    colors: {
      // A band can have multiple colors
      type: [
        {
          hex: {
            type: String,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
    },
    claspType: {
      type: String,
      required: true,
    },
    adjustableRange: {
      type: {
        minMm: {
          type: Number,
          required: true,
          min: 0,
        },
        maxMm: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      required: true,
      _id: false,
    },
    style: {
      type: String,
      required: true,
    },
    quickRelease: {
      type: Boolean,
      required: false,
      default: false,
    },
    waterResistance: {
      type: Boolean,
      required: false,
      default: false,
    },
    hypoallergenic: {
      type: Boolean,
      required: false,
      default: false,
    },
    weightMg: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

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
    color: {
      // unique with isDeleted: false
      type: {
        hex: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
      required: true,
      _id: false,
    },
    imageUrls: {
      type: [String],
      required: false,
      default: [],
    },
    additionalPriceCents: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    band: {
      type: variationBandSchema,
      required: true,
    },
    stockQuantity: {
      type: Number,
      required: false,
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
      required: false,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

modelVariationSchema.virtual("productModel", {
  ref: "ProductModel",
  localField: "productModelId",
  foreignField: "_id",
  justOne: true,
});

modelVariationSchema.index(
  { productModelId: 1, "color.hex": 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

modelVariationSchema.index(
  { productModelId: 1, "color.name": 1 },
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
