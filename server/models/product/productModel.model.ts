import mongoose from "mongoose";

const modelFeatureSchema = new mongoose.Schema(
  {
    speakerAndMicrophone: {
      type: Boolean,
      required: false,
      default: false,
    },
    waterResistance: {
      type: {
        rating: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: false,
          default: null,
        },
      },
      required: false,
      default: null,
      _id: false,
    },
    utilities: {
      type: {
        healths: {
          type: [String],
          required: false,
          default: [],
        },
        sports: {
          type: [String],
          required: false,
          default: [],
        },
        specials: {
          type: [String],
          required: false,
          default: [],
        },
        others: {
          type: [String],
          required: false,
          default: [],
        },
      },
      required: false,
      default: null,
      _id: false,
    },
    supportedAppsForNotifications: {
      type: [String],
      required: false,
      default: [],
    },
  },
  { _id: false }
);

const modelConfigSchema = new mongoose.Schema(
  {
    connectivities: {
      type: [String],
      required: false,
      default: [],
    },
    camera: {
      type: {
        resolutionMp: {
          type: Number,
          required: true,
          min: 0,
        },
        features: {
          type: [String],
          required: false,
          default: [],
        },
      },
      required: false,
      default: null,
      _id: false,
    },
    chipset: {
      type: String,
      required: true,
    },
    memory: {
      type: {
        ramBytes: {
          type: Number,
          required: true,
          min: 0,
        },
        storageBytes: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      required: true,
      _id: false,
    },
    osId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductOs",
      required: true,
    },
    compatiblePhoneOs: {
      type: [String],
      required: false,
      default: [],
    },
    appsConnect: {
      type: [String],
      required: false,
      default: [],
    },
    sensors: {
      type: [String],
      required: false,
      default: [],
    },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

modelConfigSchema.virtual("os", {
  ref: "ProductOs",
  localField: "osId",
  foreignField: "_id",
  justOne: true,
});

const modelBatterySchema = new mongoose.Schema(
  {
    capacityMah: {
      type: Number,
      required: true,
      min: 0,
    },
    timeOnline: {
      type: {
        // AOD online by minutes
        aodOnMin: {
          type: Number,
          required: true,
          min: 0,
        },
        aodOffMin: {
          type: Number,
          required: true,
          min: 0,
        },
        typicalUsageMin: {
          type: Number,
          min: 0,
          required: false,
          default: null,
        },
        standByMin: {
          type: Number,
          min: 0,
          required: false,
          default: null,
        },
      },
      required: true,
      _id: false,
    },
    timeFullChargeMin: {
      type: Number,
      required: true,
      min: 0,
    },
    chargingType: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const modelScreenSchema = new mongoose.Schema(
  {
    display: {
      type: {
        diagonalSizeInch: {
          type: Number,
          required: true,
          min: 0,
        },
        displayType: {
          type: String,
          required: true,
        },
      },
      required: true,
      _id: false,
    },
    brightness: {
      type: {
        minNits: {
          type: Number,
          required: true,
          min: 0,
        },
        maxNits: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      required: true,
      _id: false,
    },
    resolution: {
      type: {
        wPx: {
          type: Number,
          required: true,
          min: 0,
        },
        hPx: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      required: true,
      _id: false,
    },
    glassMaterial: {
      type: String,
      required: true,
    },
    bezelMaterial: {
      type: String,
      required: true,
    },
    isCircular: {
      type: Boolean,
      required: true,
    },
    diameterMm: {
      // For isCircular is true
      type: Number,
      min: 0,
      required: false,
      default: null,
    },
    dimension: {
      // For isCircular is false
      type: {
        wMm: {
          type: Number,
          min: 0,
          required: true,
        },
        hMm: {
          type: Number,
          min: 0,
          required: true,
        },
        thicknessMm: {
          type: Number,
          min: 0,
          required: true,
        },
      },
      required: false,
      default: null,
      _id: false,
    },
    shape: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const productModelSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      // unique with isDeleted: false
      type: String,
      required: true,
    },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    stockPriceCents: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrls: {
      type: [String],
      required: false,
      default: [],
    },
    feature: {
      type: modelFeatureSchema,
      required: true,
    },
    config: {
      type: modelConfigSchema,
      required: true,
    },
    battery: {
      type: modelBatterySchema,
      required: true,
    },
    screen: {
      type: modelScreenSchema,
      required: true,
    },
    caseMaterial: {
      type: String,
      required: true,
    },
    watchWeightMg: {
      type: Number,
      required: true,
      min: 0,
    },
    compatibleBandLugWidthMm: {
      type: Number,
      min: 0,
      required: true,
    },
    releaseDate: {
      type: Date,
      required: true,
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
  }
);

productModelSchema.index(
  { productId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

const ProductModel = mongoose.model("ProductModel", productModelSchema);
export default ProductModel;
