import mongoose from "mongoose";
import { VN_COUNTRY_CODE } from "../../../common/configs.common";

const userAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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
      default: VN_COUNTRY_CODE,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    fullAddress: { // For display purposes
      type: String,
      required: true,
    },
    location: {
      type: {
        locationType: {
          type: String,
          enum: ["point"],
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
      default: false,
    },
  },
  { timestamps: true }
);

userAddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

const UserAddress = mongoose.model("UserAddress", userAddressSchema);
export default UserAddress;