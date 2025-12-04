import mongoose, { Document, Model, Schema , Types} from "mongoose";

// --- INTERFACES ---
export interface IColor {
  hex: string;
  name: string;
}

export interface IVariationBand {
  widthMm: number;
  lugWidthMm: number;
  material: string;
  colors: IColor[];
  claspType: string;
  adjustableRange: { minMm: number; maxMm: number };
  style: string;
  quickRelease: boolean;
  waterResistance: boolean;
  hypoallergenic: boolean;
  weightMg: number;
}

export interface IModelVariation extends Document<Types.ObjectId> {
  productModelId: Types.ObjectId;
  name: string;
  color: IColor;
  imageUrls: string[];
  additionalPriceCents: number;
  stockAdditionalPriceCents: number;
  band: IVariationBand;
  stockQuantity: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  stopSelling: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

// --- SCHEMAS & MODELS ---
const colorSchema: Schema<IColor> = new Schema(
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
  { _id: false }
);

const variationBandSchema: Schema<IVariationBand> = new Schema(
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
      type: [colorSchema],
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

const modelVariationSchema: Schema<IModelVariation> = new Schema(
  {
    productModelId: {
      type: Schema.Types.ObjectId,
      ref: "ProductModel",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      // unique with isDeleted: false
      type: colorSchema,
      required: true,
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
    stockAdditionalPriceCents: {
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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

const ModelVariation: Model<IModelVariation> = mongoose.model<IModelVariation>(
  "ModelVariation",
  modelVariationSchema
);
export default ModelVariation;
