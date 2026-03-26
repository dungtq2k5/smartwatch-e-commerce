import type { JSX } from "react";
import type {
  AdminModelVariationResponse,
  AdminOrderResponse,
  AdminOrderReturnResponse,
  AdminProductBrandResponse,
  AdminProductCategoryResponse,
  AdminProductModelResponse,
  AdminProductOsResponse,
  AdminProductResponse,
  AdminUserResponse,
  GrnDetailsItem,
  Nullable,
  PermissionResponse,
  ProviderResponse,
  RoleDetailsResponse,
  RoleResponse,
  UserCartResponse,
  VariationInstanceResponse,
} from "../../../common/types.common";

export type FormInput<ValT = string, ErrT = string> = {
  val: ValT;
  err?: ErrT;
};

export type FormFileInput = FormInput<File | string | null, string | string[]>; // File when uploading, string when first loaded from server (url string), null when want to remove image

export type AddressFormData = {
  name: FormInput;
  phoneNumber: FormInput;
  apartmentNumber: FormInput;
  street: FormInput;
  cityProvinceCode: string;
  districtCode: string;
  wardCode: string;
  /** Represent [latitude, longitude] location for the address */
  location: [number, number];
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
  | keyof Omit<GrnDetailsItem, "stateId" | "reversedByGrnId" | "reversedAt">
  | "state"
  | "reversed"
  | "actions";

export type AdminProductBrandDisplayableField =
  | keyof Omit<AdminProductBrandResponse, "logoUrl">
  | "actions";

export type AdminProductCategoryDisplayableField =
  | keyof AdminProductCategoryResponse
  | "actions";

export type AdminProductOsDisplayableField =
  | keyof Omit<AdminProductOsResponse, "logoUrl">
  | "actions";

export type AdminProviderDisplayableField = keyof ProviderResponse | "actions";

export type AdminRoleDisplayableField = keyof RoleResponse | "actions";

export type AdminOrderDisplayableField =
  | keyof Omit<
      AdminOrderResponse,
      "fulfilledBy" | "fulfilledAt" | "buyerCancelReasonId"
    >
  | "fulfilled" // fulfilledBy and fulfilledAt combined
  | "actions";

export type AdminOrderReturnDisplayableField =
  | keyof AdminOrderReturnResponse
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

export type GrnDisplayField = DisplayField<AdminGrnDisplayableField>;

export type ProductBrandDisplayField =
  DisplayField<AdminProductBrandDisplayableField>;

export type ProductCategoryDisplayField =
  DisplayField<AdminProductCategoryDisplayableField>;

export type ProductOsDisplayField =
  DisplayField<AdminProductOsDisplayableField>;

export type ProviderDisplayField = DisplayField<AdminProviderDisplayableField>;

export type RoleDisplayField = DisplayField<AdminRoleDisplayableField>;

export type OrderDisplayField = DisplayField<AdminOrderDisplayableField>;

export type OrderReturnDisplayField =
  DisplayField<AdminOrderReturnDisplayableField>;

export type AdminConfig = {
  userManagementDisplayFields: UserDisplayField[];
  productManagementDisplayFields: ProductDisplayField[];
  productModelManagementDisplayFields: ProductModelDisplayField[];
  modelVariationManagementDisplayFields: ModelVariationDisplayField[];
  variationInstanceManagementDisplayFields: VariationInstanceDisplayField[];
  grnManagementDisplayFields: GrnDisplayField[];
  productBrandManagementDisplayFields: ProductBrandDisplayField[];
  productCategoryManagementDisplayFields: ProductCategoryDisplayField[];
  productOsManagementDisplayFields: ProductOsDisplayField[];
  providerManagementDisplayFields: ProviderDisplayField[];
  roleManagementDisplayFields: RoleDisplayField[];
  orderManagementDisplayFields: OrderDisplayField[];
  orderReturnManagementDisplayFields: OrderReturnDisplayField[];
};

export type ProductCreationWizardStep =
  | "product"
  | "model"
  | "variation"
  | "grn";

export type ProviderCreationWizardStep = "provider" | "address";

export type CustomInputProps = {
  error?: string | null;
  neverShowErrorMessage?: boolean;
};

export type ProviderAddressFormData = {
  name: FormInput;
  addressLine1: FormInput;
  addressLine2: FormInput;
  locality: FormInput;
  adminAreaL1: FormInput;
  adminAreaL2: FormInput;
  postalCode: FormInput;
  phoneNumber: FormInput;
  /** Represent [latitude, longitude] location for the address */
  location: [number, number];
  notes: FormInput;
  isDefault: boolean;
};

export type PermissionFromRoleDetails =
  RoleDetailsResponse["permissions"]["permissions"][number];

export type GroupedPermissions<
  T = PermissionResponse | PermissionFromRoleDetails,
> = {
  [category: string]: T[];
};

export type PermissionOperationKey = "create" | "read" | "update" | "delete";

export type PermissionMatrix<
  T = PermissionResponse | PermissionFromRoleDetails,
> = {
  category: string;
  operations: Nullable<Record<PermissionOperationKey, T>>;
};
