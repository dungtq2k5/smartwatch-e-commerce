import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";

export interface IUserAddress extends Document<Types.ObjectId> {
  userId: Types.ObjectId;
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
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userAddressSchema: Schema<IUserAddress> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      // For display purposes
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
    isDefault: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  { timestamps: true }
);

userAddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

const UserAddress: Model<IUserAddress> = mongoose.model<IUserAddress>(
  "UserAddress",
  userAddressSchema
);
export default UserAddress;
