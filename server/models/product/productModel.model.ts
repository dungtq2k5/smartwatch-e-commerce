import mongoose, { Document, Model, Schema, Types } from "mongoose";

// --- INTERFACES ---
export interface IModelFeature {
  speakerAndMicrophone: boolean;
  waterResistance: {
    rating: string;
    description: string | null;
  } | null;
  utilities: {
    healths: string[];
    sports: string[];
    specials: string[];
    others: string[];
  } | null;
  supportedAppsForNotifications: string[];
}

export interface IModelConfig {
  connectivities: string[];
  camera: {
    resolutionMp: number;
    features: string[];
  } | null;
  chipset: string;
  memory: {
    ramBytes: number;
    storageBytes: number;
  };
  osId: Types.ObjectId;
  compatiblePhoneOs: string[];
  appsConnect: string[];
  sensors: string[];
}

export interface IModelBattery {
  capacityMah: number;
  timeOnline: {
    aodOnMin: number;
    aodOffMin: number;
    typicalUsageMin: number | null;
    standByMin: number | null;
  };
  timeFullChargeMin: number;
  chargingType: string;
}

interface ICircularScreen {
  isCircular: true;
  diameterMm: number;
  dimension: null; // Explicitly set to null to prevent dimension from being present
}
interface INonCircularScreen {
  isCircular: false;
  diameterMm: null; // Explicitly set to null
  dimension: {
    wMm: number;
    hMm: number;
    thicknessMm: number;
  };
}
interface IModelScreenBase {
  display: {
    diagonalSizeInch: number;
    displayType: string;
  };
  brightness: {
    minNits: number;
    maxNits: number;
  };
  resolution: {
    wPx: number;
    hPx: number;
  };
  glassMaterial: string;
  bezelMaterial: string;
  shape: string;
  refreshRateHz: number | null;
}
export type IModelScreen = (ICircularScreen | INonCircularScreen) &
  IModelScreenBase;

export interface IProductModel extends Document<Types.ObjectId> {
  productId: Types.ObjectId;
  name: string;
  priceCents: number;
  stockPriceCents: number;
  imageUrls: string[];
  feature: IModelFeature;
  config: IModelConfig;
  battery: IModelBattery;
  screen: IModelScreen;
  caseMaterial: string;
  watchWeightMg: number;
  compatibleBandLugWidthMm: number;
  releaseDate: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  stopSelling: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

// --- SCHEMAS AND MODELS ---
const modelFeatureSchema: Schema<IModelFeature> = new Schema(
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

const modelConfigSchema: Schema<IModelConfig> = new Schema(
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
      type: Schema.Types.ObjectId,
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

const modelBatterySchema: Schema<IModelBattery> = new Schema(
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

const modelScreenSchema: Schema<IModelScreen> = new Schema(
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

const productModelSchema: Schema<IProductModel> = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
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

productModelSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

productModelSchema.index(
  { productId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

const ProductModel: Model<IProductModel> = mongoose.model<IProductModel>(
  "ProductModel",
  productModelSchema
);
export default ProductModel;
