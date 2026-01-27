import { Response } from "express";
import {
  AVATAR_ALLOWED_TYPES,
  ORDER_RETURN_IMG_ALLOWED_TYPES,
  PRODUCT_IMAGE_ALLOWED_TYPES,
  PRODUCT_LOGO_ALLOWED_TYPES,
  VERIFICATION_CODE_LENGTH,
} from "../../common/configs.common";
import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";
import {
  JWT_NAME,
  JWT_TTL,
  REFRESH_JWT_NAME,
  REFRESH_JWT_TTL,
  RETURN_POLICY_DAYS,
} from "../configs/configs";
import * as commonType from "../../common/types.common";
import mongoose, { Types } from "mongoose";
import ModelVariation from "../models/product/modelVariation.model";
import { appCache } from "../configs/cache";
import { HttpError } from "./errorHandler";
import { removeAllSpaces } from "../../common/utils.common";

export function isValidUrl(url: any): boolean {
  if (typeof url !== "string") return false;

  try {
    // Attempt to parse the url string as a URL.
    // This will throw an error if the string is not a valid URL format (e.g., empty, malformed).
    const parsedUrl = new URL(url);
    // Check if the protocol is HTTP or HTTPS, which are common for web-accessible images.
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    // If new URL() throws an error, it means the url string is not a valid URL.
    return false;
  }
}

export async function isValidImgUrl(
  url: any,
  category: commonType.FirebaseBucket,
): Promise<boolean> {
  if (!isValidUrl(url)) return false;

  try {
    const res = await fetch(url, { method: "HEAD" }); // use HEAD request to get headers only
    if (!res.ok) return false;

    const contentType = res.headers.get("content-type");
    const ALLOWED_TYPES =
      category === "order-return"
        ? ORDER_RETURN_IMG_ALLOWED_TYPES
        : category === "product-image"
          ? PRODUCT_IMAGE_ALLOWED_TYPES
          : category === "product-logo"
            ? PRODUCT_LOGO_ALLOWED_TYPES
            : AVATAR_ALLOWED_TYPES;

    if (contentType && ALLOWED_TYPES.includes(contentType as any)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function isValidImgUrls(
  imgUrls: any,
  category: commonType.FirebaseBucket,
): Promise<boolean> {
  if (!Array.isArray(imgUrls)) return false;

  for (const url of imgUrls) {
    if (!(await isValidImgUrl(url, category))) return false;
  }

  return true;
}

export function genVerificationCode(
  length: number = VERIFICATION_CODE_LENGTH,
): string {
  if (length <= 0) {
    throw new Error("Verification code length must be a positive integer.");
  }

  // Calculate the maximum value for a random number (e.g., 10^6 for length 6 gives range 0-999999).
  const max = Math.pow(10, length);

  // Generate a random integer from 0 to max - 1.
  const randomNumber = Math.floor(Math.random() * max);

  // Convert the number to a string and pad with leading zeros to ensure it has the correct length.
  return randomNumber.toString().padStart(length, "0");
}

export function genJwtAndSetCookie(
  res: Response,
  payload: JwtPayload,
): { accessToken: string; refreshToken: string } {
  // Create Access token
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY!, {
    expiresIn: JWT_TTL,
  });

  // Create Refresh Token
  const refreshToken = jwt.sign(payload, process.env.REFRESH_JWT_SECRET_KEY!, {
    expiresIn: REFRESH_JWT_TTL,
  });

  res.cookie(JWT_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "strict", // Prevent CSRF attacks
    maxAge: JWT_TTL,
  });

  res.cookie(REFRESH_JWT_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_JWT_TTL,
  });

  return { accessToken, refreshToken };
}

export function getJwtPayload(
  token: any,
  secret: string = process.env.JWT_SECRET_KEY!,
): JwtPayload | false {
  if (typeof token !== "string") return false;

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    return payload;
  } catch {
    return false;
  }
}

export function isValidIdArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  return arr.every((id) => Types.ObjectId.isValid(id));
}

export function isArrayOfNonEmptyStrings(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  return arr.every((item) => typeof item === "string" && !!item.trim());
}

/**
 * Retrieves the necessary properties for generating a SKU for a specific variation instance.
 *
 * This function fetches the variation, product model, and product details from the database
 * to populate the `GenSkuProps` object required by `genInstanceSkuSync`.
 *
 * @param variationId - The MongoDB ObjectId of the model variation.
 * @param session - Optional Mongoose client session for transaction support.
 * @returns A Promise that resolves to a `GenSkuProps` object containing product name, model name, and variation color.
 * @throws {Error} If the variation is not found or if the product hierarchy data is incomplete.
 */
export async function getPropsForInstanceSkuGen(
  variationId: Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<commonType.GenSkuProps> {
  const variation = await ModelVariation.aggregate([
    { $match: { _id: variationId } },
    { $project: { productModelId: 1, color: 1 } },
    {
      $lookup: {
        from: "productmodels",
        localField: "productModelId",
        foreignField: "_id",
        as: "model",
        pipeline: [{ $project: { productId: 1, name: 1 } }],
      },
    },
    { $unwind: "$model" },
    {
      $lookup: {
        from: "products",
        localField: "model.productId",
        foreignField: "_id",
        as: "product",
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    { $unwind: "$product" },
  ])
    .session(session || null)
    .then((results) => results[0]);

  if (!variation) {
    throw new Error("Model variation not found for SKU generation.");
  }
  if (!variation.model || !variation.product) {
    throw new Error("Incomplete product data for SKU generation.");
  }

  return {
    productName: variation.product.name,
    modelName: variation.model.name,
    variationColor: variation.color.name,
  };
}

/**
 * Asynchronously generates a unique SKU (Stock Keeping Unit) string for a specific product variation instance.
 *
 * This is a convenience wrapper that first retrieves the necessary product properties from the database
 * using `getPropsForInstanceSkuGen` and then generates the SKU using `genInstanceSkuSync`.
 *
 * @param variationId - The MongoDB ObjectId of the specific model variation.
 * @param session - Optional Mongoose client session for transaction support.
 * @returns A Promise that resolves to the generated SKU string (e.g., "APPLEWATCH-SERIES9-MIDNIGHT-1234567890-A1B2C3").
 * @throws {Error} If the variation cannot be found or data is incomplete.
 *
 * @see {@link getPropsForInstanceSkuGen} for data retrieval.
 * @see {@link genInstanceSkuSync} for the generation logic and format.
 */
export async function genInstanceSku(
  variationId: Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<string> {
  return genInstanceSkuSync(
    await getPropsForInstanceSkuGen(variationId, session),
  );
}

/**
 * Synchronously generates a unique SKU (Stock Keeping Unit) string based on provided product properties.
 *
 * The generated SKU follows the format: `PRODUCT-MODEL-COLOR-UNIQUEID`.
 *
 * Format breakdown:
 * 1. **Product Name**: First 10 characters of product name, uppercased with spaces removed (e.g., "Apple Watch" -> "APPLEWATCH").
 * 2. **Model Name**: First 10 characters of model name, uppercased with spaces removed (e.g., "Series 9" -> "SERIES9").
 * 3. **Variation Color**: First 10 characters of color name, uppercased with spaces removed (e.g., "Midnight" -> "MIDNIGHT").
 * 4. **Unique ID**: A combination of timestamp and random UUID characters to ensure uniqueness (e.g., "1234567890-A1B2C3").
 *
 * @param props - The properties required to generate the SKU.
 * @param props.productName - The name of the product.
 * @param props.modelName - The model name.
 * @param props.variationColor - The color name of the variation.
 *
 * @returns A formatted string representing the unique SKU (e.g., "APPLEWATCH-SERIES9-MIDNIGHT-1234567890-A1B2C3").
 */
export function genInstanceSkuSync(props: commonType.GenSkuProps): string {
  const { productName, modelName, variationColor } = props;

  const formattedProductName = removeAllSpaces(productName)
    .toUpperCase()
    .slice(0, 10);
  const formattedModelName = removeAllSpaces(modelName)
    .toUpperCase()
    .slice(0, 10);
  const formattedVariationColor = removeAllSpaces(variationColor)
    .toUpperCase()
    .slice(0, 10);
  const uniqueId =
    Date.now() + "-" + crypto.randomUUID().slice(-6).toUpperCase();

  return `${formattedProductName}-${formattedModelName}-${formattedVariationColor}-${uniqueId}`;
}

/**
 * A type guard that checks if a value is not `null` or `undefined`.
 * This is useful for filtering out `null` and `undefined` values from an array
 * while correctly narrowing the type.
 *
 * @example
 * ```ts
 * const values: (string | null | undefined)[] = ['a', null, 'b', undefined];
 * const presentValues: string[] = values.filter(isPresent);
 * // presentValues is ['a', 'b']
 * ```
 *
 * @typeParam T - The type of the value.
 * @param val - The value to check for presence.
 * @returns `true` if the value is not `null` and not `undefined`, otherwise `false`.
 */
export function isPresent<T>(val: T): val is NonNullable<T> {
  return val !== undefined && val !== null;
}

/**
 * Returns the `id` of the latest state from an array of state objects.
 *
 * @param stateArr - An array of state objects, each containing an `id` and an optional `createdAt` property.
 * @returns The `id` of the last state object in the array, or `undefined` if the array is empty.
 * @throws {HttpError} Throws an error if the state array is empty.
 */
export function getLatestStateId(
  stateArr: { id: Types.ObjectId; createdAt?: Date | null }[],
): Types.ObjectId {
  if (stateArr.length === 0) {
    throw new HttpError(500, "State array is empty.");
  }

  return stateArr.at(-1)!.id;
}

export function canReturnOrder(receivedDate: Date | null): boolean {
  // The order must have been received to be returnable
  if (!receivedDate) return false;

  // Calculate the return deadline
  const deadline = new Date(receivedDate);
  deadline.setDate(deadline.getDate() + RETURN_POLICY_DAYS);

  return new Date() < deadline;
}

// --- FORMATTING RESPONSE FUNCTIONS ---

export function formatUserResponse(user: any): commonType.UserResponse {
  return {
    id: user._id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    phoneNumber: user.phoneNumber,
    isPhoneNumberVerified: user.isPhoneNumberVerified,
    birth: user.birth,
    gender: user.gender,
    stripeCustomerId: user.stripeCustomerId,
    userBalanceCents: user.userBalanceCents,
    authProvider: user.authProvider,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function formatAdminUserResponse(
  user: any,
): commonType.AdminUserResponse {
  return {
    ...formatUserResponse(user),
    isLocked: user.isLocked,
    roles: user.roles,
  };
}

export function formatAdminUserDetailsResponse(
  user: any,
): commonType.AdminUserDetailsResponse {
  return {
    ...formatAdminUserResponse(user),
    roles: user.roles,
    addresses: {
      total: user.addresses.length,
      addresses: user.addresses.map((addr: any) =>
        formatUserAddressResponse(addr),
      ),
    },
    paymentMethods: {
      total: user.paymentMethods.length,
      methods: user.paymentMethods.map((pm: any) =>
        formatUserSelfPaymentMethodResponse(pm),
      ),
    },
    bankAccounts: {
      total: user.bankAccounts.length,
      accounts: user.bankAccounts.map((ba: any) =>
        formatUserSelfBankAccountResponse(ba),
      ),
    },
  };
}

export function formatRoleResponse(role: any): commonType.RoleResponse {
  return {
    id: role._id,
    name: role.name,
    userAssigned: role.userAssigned,
    permissions: role.permissions.map((p: any) => ({
      id: p.id,
      assignedAt: p.assignedAt,
      assignedBy: p.assignedBy,
    })),
    createdBy: role.createdBy,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export function formatPermissionResponse(
  permission: any,
): commonType.PermissionResponse {
  return {
    id: permission._id,
    name: permission.name,
    code: permission.code,
  };
}

export function formatUserAddressResponse(
  address: any,
): commonType.UserSelfAddressResponse {
  return {
    id: address._id,
    name: address.name,
    street: address.street,
    apartmentNumber: address.apartmentNumber,
    wardCode: address.wardCode,
    districtCode: address.districtCode,
    cityProvinceCode: address.cityProvinceCode,
    countryCode: address.countryCode,
    location: address.location,
    phoneNumber: address.phoneNumber,
    fullAddress: address.fullAddress,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export function formatAdminUserAddressResponse(
  address: any,
): commonType.AdminUserAddressResponse {
  return {
    ...formatUserAddressResponse(address),
    userId: address.userId,
  };
}

export function formatUserCartResponse(cart: any): commonType.UserCartResponse {
  const variation = cart.variation; // Via virtual
  const model = variation.productModelId; // Via populate
  const product = model.productId; // Via populate

  const totalCents =
    (model.priceCents + variation.additionalPriceCents) * cart.quantity;
  const stopSelling =
    product.stopSelling || model.stopSelling || variation.stopSelling;

  return {
    quantity: cart.quantity,
    totalCents,
    stopSelling,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
    variation: {
      id: variation._id,
      name: variation.name,
      color: variation.color,
      imageUrls: variation.imageUrls,
      additionalPriceCents: variation.additionalPriceCents,
      stockQuantity: variation.stockQuantity,
      productModel: {
        id: model._id,
        name: model.name,
        priceCents: model.priceCents,
        product: {
          id: product._id,
          name: product.name,
          type: product.type,
          brand: {
            id: product.brandId._id,
            name: product.brandId.name,
            logoUrl: product.brandId.logoUrl,
          },
          category: {
            id: product.categoryId._id,
            name: product.categoryId.name,
          },
        },
      },
    },
  };
}

export function formatProductResponse(
  product: any,
): commonType.ProductResponse {
  return {
    id: product._id,
    name: product.name,
    type: product.type,
    brand: formatProductBrandResponse(product.brand),
    category: formatProductCategoryResponse(product.category),
    imageUrls: product.imageUrls,
    basePriceCents: product.basePriceCents,
    description: product.description,
    createdBy: product.createdBy,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    stopSelling: product.stopSelling,
  };
}

export function formatAdminProductResponse(
  product: any,
): commonType.AdminProductResponse {
  return {
    id: product._id,
    name: product.name,
    type: product.type,
    brandId: product.brandId,
    categoryId: product.categoryId,
    imageUrls: product.imageUrls,
    basePriceCents: product.basePriceCents,
    description: product.description,
    createdBy: {
      id: product.createdBy._id,
      fullName: product.createdBy.fullName,
    },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    stopSelling: product.stopSelling,
    totalModels: product.totalModels,
    totalVariations: product.totalVariations,
  };
}

export function formatProductBrandResponse(
  brand: any,
): commonType.ProductBrandResponse {
  return {
    ...formatProductCategoryResponse(brand),
    logoUrl: brand.logoUrl,
  };
}

export function formatAdminProductBrandResponse(
  brand: any,
): commonType.AdminProductBrandResponse {
  const { createdBy, ...restData } = formatProductBrandResponse(brand);

  return {
    ...restData,
    createdBy: {
      id: brand.createdBy._id,
      fullName: brand.createdBy.fullName,
    },
  };
}

export function formatProductCategoryResponse(
  category: any,
): commonType.ProductCategoryResponse {
  return {
    id: category._id,
    name: category.name,
    description: category.description,
    createdBy: category.createdBy,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function formatAdminProductCategoryResponse(
  category: any,
): commonType.AdminProductCategoryResponse {
  const { createdBy, ...restData } = formatProductCategoryResponse(category);

  return {
    ...restData,
    createdBy: {
      id: category.createdBy._id,
      fullName: category.createdBy.fullName,
    },
  };
}

export function formatProductOsResponse(os: any): commonType.ProductOsResponse {
  return formatProductBrandResponse(os);
}

export function formatAdminProductOsResponse(
  os: any,
): commonType.AdminProductOsResponse {
  const { createdBy, ...restData } = formatProductOsResponse(os);

  return {
    ...restData,
    createdBy: {
      id: os.createdBy._id,
      fullName: os.createdBy.fullName,
    },
  };
}

export function formatProductModelResponse(
  model: any,
): commonType.ProductModelResponse {
  // Remove osId, os from config
  const { osId, os, ...config } = model.config;

  return {
    id: model._id,
    productId: model.productId,
    name: model.name,
    priceCents: model.priceCents,
    imageUrls: model.imageUrls,
    feature: model.feature,
    config: {
      ...config,
      os: formatProductOsResponse(os),
    },
    battery: model.battery,
    screen: model.screen,
    caseMaterial: model.caseMaterial,
    watchWeightMg: model.watchWeightMg,
    compatibleBandLugWidthMm: model.compatibleBandLugWidthMm,
    releaseDate: model.releaseDate,
    createdBy: model.createdBy,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    stopSelling: model.stopSelling,
  };
}

export function formatAdminProductModelResponse(
  model: any,
): commonType.AdminProductModelResponse {
  const { createdBy, ...restData } = formatProductModelResponse(model);

  return {
    ...restData,
    createdBy: {
      id: model.createdBy._id,
      fullName: model.createdBy.fullName,
    },
    stockPriceCents: model.stockPriceCents,
    totalVariations: model.totalVariations,
  };
}

export function formatAdminProductModelResponseForList(
  model: any,
): commonType.AdminProductModelResponseForList {
  return {
    id: model._id,
    productId: model.productId,
    name: model.name,
    priceCents: model.priceCents,
    imageUrls: model.imageUrls,
    feature: model.feature,
    config: model.config,
    battery: model.battery,
    screen: model.screen,
    caseMaterial: model.caseMaterial,
    watchWeightMg: model.watchWeightMg,
    compatibleBandLugWidthMm: model.compatibleBandLugWidthMm,
    releaseDate: model.releaseDate,
    createdBy: {
      id: model.createdBy._id,
      fullName: model.createdBy.fullName,
    },
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
    stopSelling: model.stopSelling,
    stockPriceCents: model.stockPriceCents,
    totalVariations: model.totalVariations,
  };
}

export function formatModelVariationResponse(
  variation: any,
): commonType.ModelVariationResponse {
  return {
    id: variation._id,
    productModelId: variation.productModelId,
    name: variation.name,
    color: variation.color,
    imageUrls: variation.imageUrls,
    additionalPriceCents: variation.additionalPriceCents,
    band: variation.band,
    stockQuantity: variation.stockQuantity,
    createdBy: variation.createdBy,
    createdAt: variation.createdAt,
    updatedAt: variation.updatedAt,
    stopSelling: variation.stopSelling,
  };
}

export function formatAdminModelVariationResponse(
  variation: any,
): commonType.AdminModelVariationResponse {
  const { createdBy, ...restData } = formatModelVariationResponse(variation);

  return {
    ...restData,
    productId: variation.productId,
    stockAdditionalPriceCents: variation.stockAdditionalPriceCents,
    createdBy: {
      id: variation.createdBy._id,
      fullName: variation.createdBy.fullName,
    },
  };
}

export function formatVariationInstanceResponse(
  instance: any,
): commonType.VariationInstanceResponse {
  return {
    id: instance._id,
    sku: instance.sku,
    modelVariationId: instance.modelVariationId,
    supplierSerialNumber: instance.supplierSerialNumber,
    supplierImeiNumber: instance.supplierImeiNumber,
    conditionId: instance.conditionId,
    isActive: instance.isActive,
    inactiveAt: instance.inactiveAt,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };
}

export function formatAdminVariationInstanceDetailsResponse(
  instance: any,
): commonType.AdminVariationInstanceDetailsResponse {
  return {
    ...formatVariationInstanceResponse(instance),
    inventoryMovements: {
      total: instance.inventoryMovements.length,
      movements: instance.inventoryMovements.map((movement: any) => {
        const { variationInstanceId, variationInstanceSku, ...restData } =
          formatInventoryMovementDetailsResponse(movement);
        return restData;
      }),
    },
  };
}

export function formatInstanceConditionResponse(
  condition: any,
): commonType.InstanceConditionResponse {
  return {
    id: condition._id,
    lookupId: condition.lookupId,
    name: condition.name,
    description: condition.description,
  };
}

export function formatProviderResponse(
  provider: any,
): commonType.ProviderResponse {
  return {
    id: provider._id,
    fullName: provider.fullName,
    email: provider.email,
    phoneNumber: provider.phoneNumber,
    createdBy: provider.createdBy,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export function formatOrderResponse(order: any): commonType.OrderResponse {
  return {
    id: order._id,
    userId: order.userId,
    items: order.items.map((item: any) => {
      const variation = item.variation; // Via virtual
      const model = variation.productModel; // Via virtual and populate
      const product = model.product; // Via virtual and populate

      return {
        variation: {
          id: variation._id,
          name: variation.name,
          color: variation.color,
          imageUrls: variation.imageUrls,
          additionalPriceCents: variation.additionalPriceCents,
          stockQuantity: variation.stockQuantity,
          stopSelling: variation.stopSelling,
          isDeleted: variation.isDeleted,
          productModel: {
            id: model._id,
            name: model.name,
            priceCents: model.priceCents,
            stopSelling: model.stopSelling,
            isDeleted: model.isDeleted,
            product: {
              id: product._id,
              name: product.name,
              stopSelling: product.stopSelling,
              isDeleted: product.isDeleted,
            },
          },
        },
        quantity: item.quantity,
        totalCents: item.totalCents,
        instances: item.instances,
      };
    }),
    deliveryAddress: order.deliveryAddress,
    transaction: order.transaction,
    paymentSummary: order.paymentSummary,
    paymentMethodId: order.paymentMethodId,
    deliveryStates: order.deliveryStates,
    paymentStates: order.paymentStates,
    states: order.states,
    orderDate: order.orderDate,
    estimateReceivedDate: order.estimateReceivedDate,
    receivedDate: order.receivedDate,
    fulfilledBy: order.fulfilledBy,
    fulfilledAt: order.fulfilledAt,
    buyerCancelReasonId: order.buyerCancelReasonId,
    canReturn: isPresent(order.canReturn)
      ? order.canReturn
      : canReturnOrder(order.receivedDate), // Make sure canReturn is always returned (because of virtuals field and will not included when use lean())
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function formatOrderDetailsResponse(
  order: any,
): commonType.OrderDetailsResponse {
  const {
    paymentMethodId,
    paymentStates,
    deliveryStates,
    states,
    ...restData
  } = formatOrderResponse(order);

  // All via populate
  return {
    ...restData,
    paymentMethod: {
      id: order.paymentMethodId._id,
      name: order.paymentMethodId.name,
    },
    paymentStates: order.paymentStates.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
    deliveryStates: order.deliveryStates.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      level: s.id.level,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
    states: order.states.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      level: s.id.level,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
  };
}

export function formatPaymentMethodResponse(
  method: any,
): commonType.PaymentMethodResponse {
  return {
    id: method._id,
    lookupId: method.lookupId,
    name: method.name,
    description: method.description,
  };
}

export function formatUserSelfPaymentMethodResponse(
  method: any,
): commonType.UserSelfPaymentMethodResponse {
  return {
    id: method._id,
    stripePaymentMethodId: method.stripePaymentMethodId,
    type: method.type,
    card: method.card,
    isDefault: method.isDefault,
    createdAt: method.createdAt,
    updatedAt: method.updatedAt,
  };
}

export function formatDeliveryStateResponse(
  state: any,
): commonType.DeliveryStateResponse {
  return {
    id: state._id,
    lookupId: state.lookupId,
    name: state.name,
    level: state.level,
  };
}

export function formatPaymentStateResponse(
  state: any,
): commonType.PaymentStateResponse {
  return {
    id: state._id,
    lookupId: state.lookupId,
    name: state.name,
  };
}

export function formatOrderReturnResponse(
  orderReturn: any,
): commonType.OrderReturnResponse {
  return {
    id: orderReturn._id,
    orderId: orderReturn.orderId,
    items: orderReturn.items.map((item: any) => {
      const variation = item.variation; // Via virtual
      const model = variation.productModel; // Via virtual and populate
      const product = model.product; // Via virtual and populate

      return {
        variation: {
          id: variation._id,
          name: variation.name,
          color: variation.color,
          imageUrls: variation.imageUrls,
          additionalPriceCents: variation.additionalPriceCents,
          stockQuantity: variation.stockQuantity,
          stopSelling: variation.stopSelling,
          isDeleted: variation.isDeleted,
          productModel: {
            id: model._id,
            name: model.name,
            priceCents: model.priceCents,
            stopSelling: model.stopSelling,
            isDeleted: model.isDeleted,
            product: {
              id: product._id,
              name: product.name,
              stopSelling: product.stopSelling,
              isDeleted: product.isDeleted,
            },
          },
        },
        quantity: item.quantity,
        totalCents: item.totalCents,
        instances: item.instances,
      };
    }),
    pickupAddress: orderReturn.pickupAddress,
    refundTransaction: orderReturn.refundTransaction,
    refundSummary: orderReturn.refundSummary,
    refundStates: orderReturn.refundStates,
    pickupStates: orderReturn.pickupStates,
    states: orderReturn.states,
    pickupDate: orderReturn.pickupDate,
    estimatePickupDate: orderReturn.estimatePickupDate,
    reasonId: orderReturn.reasonId,
    imageUrls: orderReturn.imageUrls,
    buyerReason: orderReturn.buyerReason,
    createdAt: orderReturn.createdAt,
    updatedAt: orderReturn.updatedAt,
  };
}

export function formatOrderReturnDetailsResponse(
  orderReturn: any,
): commonType.OrderReturnDetailsResponse {
  const { refundStates, pickupStates, states, reasonId, ...restData } =
    formatOrderReturnResponse(orderReturn);

  return {
    ...restData,
    reason: formatReturnReason(reasonId),
    refundStates: orderReturn.refundStates.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
    pickupStates: orderReturn.pickupStates.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      level: s.id.level,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
    states: orderReturn.states.map((s: any) => ({
      id: s.id._id,
      lookupId: s.id.lookupId,
      name: s.id.name,
      level: s.id.level,
      notes: s.notes,
      createdBy: s.createdBy,
      createdAt: s.createdAt,
    })),
  };
}

export function formatOrderStateResponse(
  state: any,
): commonType.OrderStateResponse {
  return formatDeliveryStateResponse(state);
}

export function formatPickupStateResponse(
  state: any,
): commonType.PickupStateResponse {
  return formatDeliveryStateResponse(state);
}

export function formatReturnStateResponse(
  state: any,
): commonType.ReturnStateResponse {
  return formatOrderStateResponse(state);
}

export function formatRefundStateResponse(
  state: any,
): commonType.RefundStateResponse {
  return formatPaymentStateResponse(state);
}

export function formatReturnReason(
  reason: any,
): commonType.ReturnReasonResponse {
  return {
    id: reason._id,
    name: reason.name,
    description: reason.description,
  };
}

export function formatSetupBankAccountResponse(
  account: any,
): commonType.UserBankAccountSetupResponse {
  return {
    bankAccountId: account._id,
    setupUrl: account.onboardingUrl,
    accountStatus: account.accountStatus,
  };
}

export function formatUserSelfBankAccountResponse(
  account: any,
): commonType.UserSelfBankAccountResponse {
  return {
    id: account._id,
    accountHolderName: account.accountHolderName,
    last4: account.last4,
    bankName: account.bankName,
    routingNumber: account.routingNumber,
    accountType: account.accountType,
    currency: account.currency,
    country: account.country,
    isVerified: account.isVerified,
    isDefault: account.isDefault,
    accountStatus: account.accountStatus,
    requiresAction: account.requiresAction,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export function formatSelfWithdrawalRequestResponse(
  request: any,
): commonType.SelfWithdrawalRequestResponse {
  return {
    id: request._id,
    amountCents: request.amountCents,
    currency: request.currency,
    states: request.states,
    withdrawalMethod: request.withdrawalMethod,
    stripeTransferGroupId: request.stripeTransferGroupId,
    stripeTransferId: request.stripeTransferId,
    bankAccount: request.bankAccount,
    failureReason: request.failureReason,
    processedAt: request.processedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function formatWithdrawalStateResponse(
  state: any,
): commonType.WithdrawalStateResponse {
  return formatOrderStateResponse(state);
}

export function formatInventoryMovementResponse(
  movement: any,
): commonType.InventoryMovementResponse {
  return {
    id: movement._id,
    variationInstanceId: movement.variationInstanceId,
    variationInstanceSku: movement.variationInstanceSku,
    inventoryMovementTypeId: movement.inventoryMovementTypeId,
    grnId: movement.grnId,
    createdBy: {
      id: movement.createdBy._id,
      fullName: movement.createdBy.fullName,
    },
    movementDate: movement.movementDate,
    quantity: movement.quantity,
    notes: movement.notes,
    createdAt: movement.createdAt,
  };
}

export function formatInventoryMovementDetailsResponse(
  movement: any,
): commonType.InventoryMovementDetailsResponse {
  const { grnId, ...restData } = formatInventoryMovementResponse(movement);

  return {
    ...restData,
    grn: movement.grn,
  };
}

export function formatGrnResponse(grn: any): commonType.GrnResponse {
  return {
    id: grn._id,
    name: grn.name,
    providerId: grn.providerId,
    createdBy: {
      id: grn.createdBy._id,
      fullName: grn.createdBy.fullName,
    },
    totalPriceCents: grn.totalPriceCents,
    quantity: grn.quantity,
    notes: grn.notes,
    stateId: grn.stateId,
    createdAt: grn.created,
    reversedByGrnId: grn.reversedByGrnId,
    reversedAt: grn.reversedAt,
  };
}

export function formatGrnDetailsResponse(
  grn: any,
): commonType.GrnDetailsResponse {
  const { providerId, ...restData } = formatGrnResponse(grn);

  return {
    ...restData,
    provider: {
      id: grn.provider._id,
      fullName: grn.provider.fullName,
    },
  };
}

export function formatGrnStateResponse(
  state: any,
): commonType.GrnStateResponse {
  return {
    id: state._id,
    lookupId: state.lookupId,
    name: state.name,
    description: state.description,
  };
}

export function formatInventoryMovementTypeResponse(
  type: any,
): commonType.InventoryMovementTypeResponse {
  return {
    id: type._id,
    lookupId: type.lookupId,
    name: type.name,
    description: type.description,
  };
}

// --- CACHING FUNCTIONS ---
export function getInstanceConditionId(lookupId: string): Types.ObjectId {
  const { instanceConditions } = appCache;
  if (!instanceConditions) {
    throw new Error("Application cache not initialized properly.");
  }

  const conditionId = instanceConditions[lookupId];
  if (!conditionId) {
    throw new Error(
      `Condition with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return conditionId;
}

export function getMovementTypeId(lookupId: string): Types.ObjectId {
  const { inventoryMovementTypes } = appCache;
  if (!inventoryMovementTypes) {
    throw new Error("Application cache not initialized properly.");
  }

  const movementTypeId = inventoryMovementTypes[lookupId];
  if (!movementTypeId) {
    throw new Error(
      `Movement type with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return movementTypeId;
}

export function getDeliveryStateId(lookupId: string): Types.ObjectId {
  const { deliveryStates } = appCache;
  if (!deliveryStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = deliveryStates[lookupId];
  if (!state) {
    throw new Error(
      `Delivery state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return state.id;
}

export function getDeliveryStateLevel(
  stateId: Types.ObjectId | string,
): number {
  const { deliveryStates } = appCache;
  if (!deliveryStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const stateName in deliveryStates) {
    if (deliveryStates[stateName].id.equals(stateId)) {
      return deliveryStates[stateName].level;
    }
  }

  throw new Error(`Delivery state with ID '${stateId}' not found in cache.`);
}

export function getDeliveryStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { deliveryStates } = appCache;
  if (!deliveryStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in deliveryStates) {
    if (deliveryStates[lookupId].id.equals(stateId)) {
      return lookupId;
    }
  }
  throw new Error(`Delivery state with ID '${stateId}' not found in cache.`);
}

export function getPaymentStateId(lookupId: string): Types.ObjectId {
  const { paymentStates } = appCache;
  if (!paymentStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const stateId = paymentStates[lookupId];
  if (!stateId) {
    throw new Error(
      `Payment state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return stateId;
}

export function getPaymentStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { paymentStates } = appCache;
  if (!paymentStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in paymentStates) {
    if (paymentStates[lookupId].equals(stateId)) {
      return lookupId;
    }
  }

  throw new Error(`Payment state with ID '${stateId}' not found in cache.`);
}

export function getOrderStateId(lookupId: string): Types.ObjectId {
  const { orderStates } = appCache;
  if (!orderStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = orderStates[lookupId];
  if (!state) {
    throw new Error(
      `Order state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return state.id;
}

export function getOrderStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { orderStates } = appCache;
  if (!orderStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in orderStates) {
    if (orderStates[lookupId].id.equals(stateId)) {
      return lookupId;
    }
  }

  throw new Error(`Order state with ID '${stateId}' not found in cache.`);
}

export function getOrderStateLevel(stateId: Types.ObjectId | string): number {
  const { orderStates } = appCache;
  if (!orderStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const stateName in orderStates) {
    if (orderStates[stateName].id.equals(stateId)) {
      return orderStates[stateName].level;
    }
  }

  throw new Error(`Order state with ID '${stateId}' not found in cache.`);
}

export function getPaymentMethodId(lookupId: string): Types.ObjectId {
  const { paymentMethods } = appCache;
  if (!paymentMethods) {
    throw new Error("Application cache not initialized properly.");
  }

  const methodId = paymentMethods[lookupId];
  if (!methodId) {
    throw new Error(
      `Payment method with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return methodId;
}

export function getPaymentMethodLookupId(
  methodId: Types.ObjectId | string,
): string {
  const { paymentMethods } = appCache;
  if (!paymentMethods) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in paymentMethods) {
    if (paymentMethods[lookupId].equals(methodId)) {
      return lookupId;
    }
  }

  throw new Error(`Payment method with ID '${methodId}' not found in cache.`);
}

export function getSysUserId(): Types.ObjectId {
  const { systemUserId } = appCache;
  if (!systemUserId) {
    throw new Error("System user ID not found in application cache.");
  }

  return systemUserId;
}

export function getRefundStateId(lookupId: string): Types.ObjectId {
  const { refundStates } = appCache;
  if (!refundStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const stateId = refundStates[lookupId];
  if (!stateId) {
    throw new Error(
      `Refund state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return stateId;
}

export function getRefundStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { refundStates } = appCache;
  if (!refundStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in refundStates) {
    if (refundStates[lookupId].equals(stateId)) {
      return lookupId;
    }
  }

  throw new Error(`Refund state with ID '${stateId}' not found in cache.`);
}

export function getReturnStateId(lookupId: string): Types.ObjectId {
  const { returnStates } = appCache;
  if (!returnStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = returnStates[lookupId];
  if (!state) {
    throw new Error(
      `Return state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return state.id;
}

export function getReturnStateLevel(stateId: Types.ObjectId | string): number {
  const { returnStates } = appCache;
  if (!returnStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const stateName in returnStates) {
    if (returnStates[stateName].id.equals(stateId)) {
      return returnStates[stateName].level;
    }
  }
  throw new Error(`Return state with ID '${stateId}' not found in cache.`);
}

export function getReturnStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { returnStates } = appCache;
  if (!returnStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in returnStates) {
    if (returnStates[lookupId].id.equals(stateId)) {
      return lookupId;
    }
  }
  throw new Error(`Return state with ID '${stateId}' not found in cache.`);
}

export function getPickupStateId(lookupId: string): Types.ObjectId {
  const { pickupStates } = appCache;
  if (!pickupStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = pickupStates[lookupId];
  if (!state) {
    throw new Error(
      `Pickup state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return state.id;
}

export function getPickupStateLevel(stateId: Types.ObjectId | string): number {
  const { pickupStates } = appCache;
  if (!pickupStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const stateName in pickupStates) {
    if (pickupStates[stateName].id.equals(stateId)) {
      return pickupStates[stateName].level;
    }
  }
  throw new Error(`Pickup state with ID '${stateId}' not found in cache.`);
}

export function getPickupStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { pickupStates } = appCache;
  if (!pickupStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in pickupStates) {
    if (pickupStates[lookupId].id.equals(stateId)) {
      return lookupId;
    }
  }
  throw new Error(`Pickup state with ID '${stateId}' not found in cache.`);
}

export function getAdminRoleId(): Types.ObjectId {
  const { adminRoleId } = appCache;
  if (!adminRoleId) {
    throw new Error("Admin role ID not found in application cache.");
  }

  return adminRoleId;
}

export function getBuyerRoleId(): Types.ObjectId {
  const { buyerRoleId } = appCache;
  if (!buyerRoleId) {
    throw new Error("Buyer role ID not found in application cache.");
  }

  return buyerRoleId;
}

export function getWithdrawalStateId(lookupId: string): Types.ObjectId {
  const { withdrawalStates } = appCache;
  if (!withdrawalStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = withdrawalStates[lookupId];
  if (!state) {
    throw new Error(
      `Withdrawal state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return state.id;
}

export function getWithdrawalStateLevel(
  stateId: Types.ObjectId | string,
): number {
  const { withdrawalStates } = appCache;
  if (!withdrawalStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const stateName in withdrawalStates) {
    if (withdrawalStates[stateName].id.equals(stateId)) {
      return withdrawalStates[stateName].level;
    }
  }

  throw new Error(`Withdrawal state with ID '${stateId}' not found in cache.`);
}

export function getWithdrawalStateLookupId(
  stateId: Types.ObjectId | string,
): string {
  const { withdrawalStates } = appCache;
  if (!withdrawalStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in withdrawalStates) {
    if (withdrawalStates[lookupId].id.equals(stateId)) {
      return lookupId;
    }
  }

  throw new Error(`Withdrawal state with ID '${stateId}' not found in cache.`);
}

export function getGrnStateId(lookupId: string): Types.ObjectId {
  const { grnStates } = appCache;
  if (!grnStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const stateId = grnStates[lookupId];
  if (!stateId) {
    throw new Error(
      `GRN state with lookupId '${lookupId}' not found in cache.`,
    );
  }

  return stateId;
}

export function getGrnStateLookupId(stateId: Types.ObjectId | string): string {
  const { grnStates } = appCache;
  if (!grnStates) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const lookupId in grnStates) {
    if (grnStates[lookupId].equals(stateId)) {
      return lookupId;
    }
  }

  throw new Error(`GRN state with ID '${stateId}' not found in cache.`);
}
