import {
  AVATAR_ALLOWED_TYPES,
  VERIFICATION_CODE_LENGTH,
} from "../../common/configs.common";
import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";
import { JWT_NAME, JWT_TTL } from "../configs/configs";
import {
  AdminUserAddressResponse,
  AdminUserResponse,
  ProductBrandResponse,
  ProductCategoryResponse,
  ProductOsResponse,
  ProductResponse,
  ProductModelResponse,
  RoleResponse,
  UserAddressResponse,
  UserCartResponse,
  UserResponse,
  ModelVariationResponse,
  VariationInstanceResponse,
  ProviderResponse,
  OrderResponse,
} from "../../common/types.common";
import { Types } from "mongoose";
import ModelVariation from "../models/product/modelVariation.model";
import { appCache } from "../configs/cache";

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

export async function isValidImgUrl(url: any): Promise<boolean> {
  if (!isValidUrl(url)) return false;

  try {
    const res = await fetch(url, { method: "HEAD" }); // use HEAD request to get headers only
    if (!res.ok) return false;

    const contentType = res.headers.get("content-type");
    if (contentType && AVATAR_ALLOWED_TYPES.includes(contentType as any))
      return true;

    return false;
  } catch {
    return false;
  }
}

export async function isValidImgUrls(imgUrls: any): Promise<boolean> {
  if (!Array.isArray(imgUrls)) return false;

  for (const url of imgUrls) {
    if (!(await isValidImgUrl(url))) return false;
  }

  return true;
}

export function genVerificationCode(
  length: number = VERIFICATION_CODE_LENGTH
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

export function genJWTAndSetCookie(
  res: any,
  userId: string,
  isVerified: boolean
): string {
  const token = jwt.sign(
    { userId, isVerified } as JwtPayload,
    process.env.JWT_SECRET_KEY!,
    { expiresIn: JWT_TTL }
  );

  res.cookie(JWT_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "Strict", // Prevent CSRF attacks
    maxAge: JWT_TTL,
  });

  return token;
}

export function getJWTPayload(token: any): JwtPayload | false {
  if (typeof token !== "string") return false;

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY!
    ) as JwtPayload;

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

/*
SKU format: [BRAND_CODE]-[MODEL_NAME]-[SIZE_MM]-[VAR_TYPE_CODE]-[VAR_NAME_CODE]-[UNIQUE_ID]
- BRAND_CODE: A 3-letter abbreviation of the product's brand name (e.g., APL for Apple).
- MODEL_NAME: The model from the ProductModel, sanitized (e.g., "Series 9" becomes "S9").
- SIZE_MM: The watchSizeMm from the ProductModel (e.g., 45).
- VAR_TYPE_CODE: A short code for the variation type (CLR for color, BND for band).
- VAR_NAME_CODE: A 3-letter abbreviation of the variation's name (e.g., MID for Midnight).
- UNIQUE_ID: A unique identifier to prevent collisions. A combination of the current timestamp and a random string is a reliable method.
-> Example SKU: APL-S9-45-CLR-MID-L9SO2A1
*/
export async function genInstanceSku(
  variationId: Types.ObjectId
): Promise<string> {
  const variation = await ModelVariation.findById(variationId)
    .populate({
      path: "productModelId",
      select: "model watchSizeMm productId",
      populate: {
        path: "productId",
        select: "brandId",
        populate: {
          path: "brandId",
          select: "name",
        },
      },
    })
    .lean();

  if (!variation) {
    throw new Error("Model variation not found for SKU generation.");
  }

  const productModel = variation.productModelId as any;
  if (
    !productModel ||
    !productModel.productId ||
    !productModel.productId.brandId
  ) {
    throw new Error("Incomplete product data for SKU generation.");
  }

  // 1. Brand Code (e.g., "Apple" -> "APL")
  const brandName = productModel.productId.brandId.name;
  const brandCode = brandName.substring(0, 3).toUpperCase();

  // 2. Model Name (e.g., "Series 9" -> "S9")
  const modelName = productModel.model.replace(/[^a-zA-Z0-9]/g, "");

  // 3. Watch Size (e.g., 45)
  const sizeMm = productModel.watchSizeMm;

  // 4. Variation Name Code (e.g., "Midnight" -> "MID")
  const varNameCode = variation.name.substring(0, 3).toUpperCase();

  // 5. Unique ID (e.g., "L9SO2A1")
  const uniqueId =
    Date.now().toString(36).slice(-4).toUpperCase() +
    Math.random().toString(36).slice(-3).toUpperCase();

  return `${brandCode}-${modelName}-${sizeMm}-${varNameCode}-${uniqueId}`;
}

export function compareAddress(address1: any, address2: any): boolean {
  return (
    address1.name === address2.name &&
    address1.street === address2.street &&
    address1.apartmentNumber === address2.apartmentNumber &&
    address1.wardCode === address2.wardCode &&
    address1.districtCode === address2.districtCode &&
    address1.cityProvinceCode === address2.cityProvinceCode &&
    address1.countryCode === address2.countryCode &&
    address1.location.coordinates[0] === address2.location.coordinates[0] && // long
    address1.location.coordinates[1] === address2.location.coordinates[1] && // lat
    address1.phoneNumber === address2.phoneNumber
  );
}

/*
 * Check if a value is present (not undefined or null).
 * @param val - The value to check.
 * @returns {boolean} - True if the value is present, false otherwise.
 */
export function isPresent(val: any): boolean {
  return val !== undefined && val !== null;
}

// --- FORMATTING RESPONSE FUNCTIONS ---

export function formatUserResponse(user: any): UserResponse {
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

export function formatAdminUserResponse(user: any): AdminUserResponse {
  return {
    ...formatUserResponse(user),
    isLocked: user.isLocked,
  };
}

export function formatRoleResponse(role: any): RoleResponse {
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

export function formatUserAddressResponse(address: any): UserAddressResponse {
  return {
    id: address._id,
    name: address.name,
    street: address.street,
    apartmentNumber: address.apartmentNumber,
    wardCode: address.wardCode,
    districtCode: address.districtCode,
    cityProvinceCode: address.cityProvinceCode,
    countryCode: address.country,
    location: address.location,
    phoneNumber: address.phoneNumber,
    fullAddress: address.fullAddress,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export function formatAdminUserAddressResponse(
  address: any
): AdminUserAddressResponse {
  return {
    ...formatUserAddressResponse(address),
    userId: address.userId,
  };
}

export function formatUserCartResponse(cart: any): UserCartResponse {
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

export function formatProductResponse(product: any): ProductResponse {
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

export function formatProductBrandResponse(brand: any): ProductBrandResponse {
  return {
    ...formatProductCategoryResponse(brand),
    logoUrl: brand.logoUrl,
  };
}

export function formatProductCategoryResponse(
  category: any
): ProductCategoryResponse {
  return {
    id: category._id,
    name: category.name,
    description: category.description,
    createdBy: category.createdBy,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function formatProductOsResponse(os: any): ProductOsResponse {
  return formatProductBrandResponse(os);
}

export function formatProductModelResponse(model: any): ProductModelResponse {
  // Remove osId, os from config
  const { osId, os, ...config } = model.config;

  return {
    id: model._id,
    productId: model.productId,
    name: model.name,
    priceCents: model.priceCents,
    stockPriceCents: model.stockPriceCents,
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

export function formatModelVariationResponse(
  variation: any
): ModelVariationResponse {
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

export function formatVariationInstanceResponse(
  instance: any
): VariationInstanceResponse {
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

export function formatProviderResponse(provider: any): ProviderResponse {
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

export function formatOrderResponse(order: any): OrderResponse {
  return {
    id: order._id,
    userId: order.userId,
    items: order.items,
    totalCents: order.totalCents,
    deliveryStateId: order.deliveryStateId,
    orderDate: order.orderDate,
    estimateReceivedDate: order.estimateReceivedDate,
    receivedDate: order.receivedDate,
    deliveryAddress: order.deliveryAddress,
    payment: order.payment,
    paymentMethodId: order.paymentMethodId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// --- CACHING FUNCTIONS ---
export function getConditionId(conditionName: string): Types.ObjectId {
  const { instanceConditions } = appCache;
  if (!instanceConditions) {
    throw new Error("Application cache not initialized properly.");
  }

  const conditionId = instanceConditions[conditionName.toLowerCase()];
  if (!conditionId) {
    throw new Error(`Condition '${conditionName}' not found in cache.`);
  }

  return conditionId;
}

export function getMovementTypeId(movementTypeName: string): Types.ObjectId {
  const { inventoryMovementTypes } = appCache;
  if (!inventoryMovementTypes) {
    throw new Error("Application cache not initialized properly.");
  }

  const movementTypeId = inventoryMovementTypes[movementTypeName.toLowerCase()];
  if (!movementTypeId) {
    throw new Error(`Movement type '${movementTypeName}' not found in cache.`);
  }

  return movementTypeId;
}

export function getDeliveryStateId(stateName: string): Types.ObjectId {
  const { deliveryStates } = appCache;
  if (!deliveryStates) {
    throw new Error("Application cache not initialized properly.");
  }

  const state = deliveryStates[stateName.toLowerCase()];
  if (!state) {
    throw new Error(`Delivery state '${stateName}' not found in cache.`);
  }

  return state.id;
}

export function getDeliveryStateLevel(stateId: Types.ObjectId): number {
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

export function getPaymentStatusId(statusName: string): Types.ObjectId {
  const { paymentStatuses } = appCache;
  if (!paymentStatuses) {
    throw new Error("Application cache not initialized properly.");
  }

  const statusId = paymentStatuses[statusName.toLowerCase()];
  if (!statusId) {
    throw new Error(`Payment status '${statusName}' not found in cache.`);
  }

  return statusId;
}

export function getPaymentStatusName(statusId: Types.ObjectId): string {
  const { paymentStatuses } = appCache;
  if (!paymentStatuses) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const statusName in paymentStatuses) {
    if (paymentStatuses[statusName].equals(statusId)) {
      return statusName;
    }
  }

  throw new Error(`Payment status with ID '${statusId}' not found in cache.`);
}

export function getPaymentMethodId(methodName: string): Types.ObjectId {
  const { paymentMethods } = appCache;
  if (!paymentMethods) {
    throw new Error("Application cache not initialized properly.");
  }

  const methodId = paymentMethods[methodName.toLowerCase()];
  if (!methodId) {
    throw new Error(`Payment method '${methodName}' not found in cache.`);
  }

  return methodId;
}

export function getPaymentMethodName(methodId: Types.ObjectId): string {
  const { paymentMethods } = appCache;
  if (!paymentMethods) {
    throw new Error("Application cache not initialized properly.");
  }

  for (const methodName in paymentMethods) {
    if (paymentMethods[methodName].equals(methodId)) {
      return methodName;
    }
  }

  throw new Error(`Payment method with ID '${methodId}' not found in cache.`);
}
