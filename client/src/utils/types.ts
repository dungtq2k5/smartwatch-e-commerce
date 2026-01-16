import type { JSX } from "react";
import type {
  AdminModelVariationResponse,
  AdminProductModelResponse,
  AdminProductResponse,
  AdminUserResponse,
  BaseUserAddress,
  GrnDetailsResponse,
  OrderReturnSearchQuery,
  UserCartResponse,
  VariationInstanceResponse,
} from "../../../common/types.common";

export type FormInput<ValT = string, ErrT = string> = {
  val: ValT;
  err?: ErrT;
};

export type FormFileInput = FormInput<File | string | null, string | string[]>; // File when uploading, string when first loaded from server (url string), null when want to remove image

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

export type ItemPicked<ItemT> = {
  idx: number;
  data: ItemT;
} | null;

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
  ({ userId?: string; orderId?: never } | { userId?: never; orderId?: string });

export type AdminUserDisplayableField =
  | keyof Omit<
      AdminUserResponse,
      "avatarUrl" | "isEmailVerified" | "isPhoneNumberVerified" | "isLocked"
    >
  | "accountVerified"
  | "accountStatus"
  | "actions";

export type AdminProductDisplayableField =
  | keyof Omit<AdminProductResponse, "imageUrls">
  | "actions";

export type AdminProductModelDisplayableField =
  | keyof Omit<
      AdminProductModelResponse,
      "imageUrls" | "feature" | "config" | "battery" | "screen"
    >
  | "actions";

export type AdminModelVariationDisplayableField =
  | keyof Omit<AdminModelVariationResponse, "imageUrls" | "band">
  | "actions";

export type AdminVariationInstanceDisplayableField =
  | keyof Omit<VariationInstanceResponse, "inactiveAt">
  | "actions";

export type AdminGrnDisplayableField =
  | keyof Omit<GrnDetailsResponse, "stateId" | "reversedByGrnId" | "reversedAt">
  | "state"
  | "reversed"
  | "actions";

export type TableColDisplay<Item, SortOption> = {
  label: string; // For header display
  thClassName?: string; // Additional className for <th>
  tdClassName?: string; // Additional className for <td>
  tdContent: (item: Item) => JSX.Element; // For <td> content rendering
  getCsvVal: (item: Item) => string | number | boolean | null;
} & (
  | {
      isSortable: true;
      sortKey: { asc: SortOption; desc: SortOption };
    }
  | {
      isSortable?: false;
      sortKey?: never;
    }
);

export type DisplayField<F extends string> = {
  name: F;
  visible: boolean;
  exportable: boolean;
};

export type UserDisplayField = DisplayField<AdminUserDisplayableField>;

export type ProductDisplayField = DisplayField<AdminProductDisplayableField>;

export type ProductModelDisplayField =
  DisplayField<AdminProductModelDisplayableField>;

export type ModelVariationDisplayField =
  DisplayField<AdminModelVariationDisplayableField>;

export type VariationInstanceDisplayField =
  DisplayField<AdminVariationInstanceDisplayableField>;

export type GrnDisplayField =
  DisplayField<AdminGrnDisplayableField>;

export type AdminConfig = {
  userManagementDisplayFields: UserDisplayField[];
  productManagementDisplayFields: ProductDisplayField[];
  productModelManagementDisplayFields: ProductModelDisplayField[];
  modelVariationManagementDisplayFields: ModelVariationDisplayField[];
  variationInstanceManagementDisplayFields: VariationInstanceDisplayField[];
  grnManagementDisplayFields: GrnDisplayField[];
};

export type ProductCreationWizardStep = "product" | "model" | "variation" | "grn";