import type {
  BaseUserAddress,
  ModelVariationResponse,
  OrderReturnSearchQuery,
  ProductModelResponse,
  UserCartResponse,
} from "../../../common/types.common";

export type FormInput = {
  val: string;
  err?: string;
};

export type FormFileInput = {
  file?: File | string | null; // File when uploading, string when first loaded from server (url string), null when want to remove image
  err?: string | string[];
};

export type UserAddressFormat = Pick<
  BaseUserAddress,
  | "street"
  | "apartmentNumber"
  | "wardCode"
  | "districtCode"
  | "cityProvinceCode"
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

type Picked = {
  idx: number;
};

export type ModelPicked =
  | (Picked & {
      model: ProductModelResponse;
    })
  | undefined;

export type VariationPicked =
  | (Picked & {
      variation: ModelVariationResponse;
    })
  | undefined;

export type UserCartUpdate = {
  variationId: string;
  quantity: number;
};

export type BuyNowItem = {
  variation: UserCartResponse["variation"];
  totalCents: number; // variation.additionalPriceCents + model.priceCents
  quantity: number;
};

export type PurchaseTab =
  | "all"
  | "to-pay"
  | "to-ship"
  | "to-receive"
  | "completed"
  | "cancelled"
  | "return-refund";

export type OrderReturnSearchQueryCli = Omit<OrderReturnSearchQuery, "userId"> &
  (
    | { userId?: string; orderId?: never }
    | { userId?: never; orderId?: string }
  );
