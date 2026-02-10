import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IProviderAddress extends Document<Types.ObjectId> {
  providerId: Types.ObjectId;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  locality: string;
  adminAreaL1: string;
  adminAreaL2: string | null;
  postalCode: string;
  phoneNumber: string;
  location: {
    locationType: "point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  notes: string | null;
  isDefault: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const providerAddressSchema: Schema<IProviderAddress> = new Schema(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
      required: false,
      default: null,
    },
    locality: {
      type: String,
      required: true,
    },
    adminAreaL1: {
      type: String,
      required: true,
    },
    adminAreaL2: {
      type: String,
      required: false,
      default: null,
    },
    postalCode: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    location: {
      type: {
        locationType: {
          type: String,
          enum: ["point"],
          required: true,
          default: "point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
      required: true,
      _id: false,
    },
    notes: {
      type: String,
      required: false,
      default: null,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Ensure one default address per provider
providerAddressSchema.index(
  { providerId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

const ProviderAddress: Model<IProviderAddress> =
  mongoose.model<IProviderAddress>("ProviderAddress", providerAddressSchema);
export default ProviderAddress;
