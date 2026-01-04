import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";

export interface IProviderAddress extends Document<Types.ObjectId> {
  providerId: Types.ObjectId;
  name: string;
  street: string;
  apartmentNumber: string;
  wardCode: string;
  districtCode: string;
  cityProvinceCode: string;
  countryCode: string;
  phoneNumber: string;
  fullAddress: string;
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
    street: {
      type: String,
      required: true,
    },
    apartmentNumber: {
      type: String,
      required: true,
    },
    wardCode: {
      type: String,
      required: true,
    },
    districtCode: {
      type: String,
      required: true,
    },
    cityProvinceCode: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      required: false,
      default: VN_COUNTRY_CODE,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    fullAddress: {
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
  { timestamps: true }
);

// Ensure one default address per provider
providerAddressSchema.index(
  { providerId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

const ProviderAddress: Model<IProviderAddress> =
  mongoose.model<IProviderAddress>("ProviderAddress", providerAddressSchema);
export default ProviderAddress;
