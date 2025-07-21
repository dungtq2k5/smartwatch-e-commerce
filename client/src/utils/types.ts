import type { BaseUserAddress } from "../../../common/types.common";

export type FormInput = {
  val: string;
  err?: string;
};

export type FormFileInput = {
  file?: File | string | null; // File when uploading, string when first loaded from server (url string), null when want to remove image
  err?: string | string[];
}

export type UserAddressFormat = Omit<
  BaseUserAddress,
  "id" | "userId" | "phoneNumber" | "location" | "fullAddress" | "createdAt" | "updatedAt"
>;

export type AddressFormData = {
  name: FormInput;
  phoneNumber: FormInput;
  apartmentNumber: FormInput;
  street: FormInput;
  cityProvinceCode: string;
  districtCode: string;
  wardCode: string;
  location: [number, number]; // [longitude, latitude]
  isDefault: boolean;
};