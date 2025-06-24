import mongoose from "mongoose";

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
    ward: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    cityProvince: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: "vietnam",
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: {
        unique: true,
        partialFilterExpression: { isDefault: true },
      },
    },
  },
  { timestamps: true }
);

const UserAddress = mongoose.model("UserAddress", userAddressSchema);
export default UserAddress;