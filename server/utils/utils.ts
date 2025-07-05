import { AVATAR_ALLOWED_TYPES } from "../../common/configs.common";
import { VERIFICATION_CODE_LENGTH } from "../../common/configs.common";
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
  } catch (_) {
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
    if (contentType && AVATAR_ALLOWED_TYPES.includes(contentType)) return true;

    return false;
  } catch (error) {
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
  } catch (_) {
    return false;
  }
}

export function isValidIdArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  return arr.every((id) => Types.ObjectId.isValid(id));
}

export function isArrayOfStrings(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  return arr.every((item) => typeof item === "string");
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

  // 4. Variation Type Code (e.g., "color" -> "CLR")
  const varTypeCode = variation.type.substring(0, 3).toUpperCase();

  // 5. Variation Name Code (e.g., "Midnight" -> "MID")
  const varNameCode = variation.name.substring(0, 3).toUpperCase();

  // 6. Unique ID (e.g., "L9SO2A1")
  const uniqueId =
    Date.now().toString(36).slice(-4).toUpperCase() +
    Math.random().toString(36).slice(-3).toUpperCase();

  return `${brandCode}-${modelName}-${sizeMm}-${varTypeCode}-${varNameCode}-${uniqueId}`;
}

export function compareAddress(
  address1: any,
  address2: any
): boolean {
  return (
    address1.name === address2.name &&
    address1.street === address2.street &&
    address1.apartmentNumber === address2.apartmentNumber &&
    address1.ward === address2.ward &&
    address1.district === address2.district &&
    address1.cityProvince === address2.cityProvince &&
    address1.country === address2.country &&
    address1.phoneNumber === address2.phoneNumber
  );
}

// --- FORMATTING RESPONSE FUNCTIONS ---
export function formatUserResponse(user: any): UserResponse {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ? user.avatarUrl : undefined,
    email: user.email ? user.email : undefined,
    isEmailVerified: user.isEmailVerified,
    phoneNumber: user.phoneNumber ? user.phoneNumber : undefined,
    isPhoneNumberVerified: user.isPhoneNumberVerified,
    stripeCustomerId: user.stripeCustomerId ? user.stripeCustomerId : undefined,
    userBalanceCents: user.userBalanceCents,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
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
    id: role._id.toString(),
    name: role.name,
    userAssigned: role.userAssigned,
    permissions: role.permissions.map((p: any) => ({
      id: p.id.toString(),
      assignedAt: p.assignedAt.toISOString(),
      assignedBy: p.assignedBy.toString(),
    })),
    createdBy: role.createdBy.toString(),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

export function formatUserAddressResponse(address: any): UserAddressResponse {
  return {
    id: address._id.toString(),
    name: address.name,
    street: address.street,
    apartmentNumber: address.apartmentNumber,
    ward: address.ward,
    district: address.district,
    cityProvince: address.cityProvince,
    country: address.country,
    phoneNumber: address.phoneNumber,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}

export function formatAdminUserAddressResponse(
  address: any
): AdminUserAddressResponse {
  return {
    ...formatUserAddressResponse(address),
    userId: address.userId.toString(),
  };
}

export function formatUserCartResponse(cart: any): UserCartResponse {
  return {
    variationId: cart.variationId.toString(),
    quantity: cart.quantity,
    createdAt: cart.createdAt.toISOString(),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export function formatProductResponse(product: any): ProductResponse {
  return {
    id: product._id.toString(),
    name: product.name,
    brandId: product.brandId.toString(),
    categoryId: product.categoryId.toString(),
    imageUrls: product.imageUrls,
    description: product.description,
    createdBy: product.createdBy.toString(),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    stopSelling: product.stopSelling,
  };
}

export function formatProductBrandResponse(brand: any): ProductBrandResponse {
  return {
    id: brand._id.toString(),
    name: brand.name,
    createdBy: brand.createdBy.toString(),
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}

export function formatProductCategoryResponse(
  category: any
): ProductCategoryResponse {
  return formatProductBrandResponse(category);
}

export function formatProductOsResponse(os: any): ProductOsResponse {
  return formatProductBrandResponse(os);
}

export function formatProductModelResponse(model: any): ProductModelResponse {
  return {
    id: model._id.toString(),
    productId: model.productId.toString(),
    model: model.model,
    name: model.name,
    watchSizeMm: model.watchSizeMm,
    priceCents: model.priceCents,
    basePriceCents: model.basePriceCents,
    imageUrls: model.imageUrls,
    displaySizeMm: model.displaySizeMm,
    displayType: model.displayType,
    resolutionHPx: model.resolutionHPx,
    resolutionWPx: model.resolutionWPx,
    ramBytes: model.ramBytes,
    romBytes: model.romBytes,
    osId: model.osId.toString(),
    connectivities: model.connectivities,
    batteryLifeMah: model.batteryLifeMah,
    waterResistanceValue: model.waterResistanceValue,
    waterResistanceUnit: model.waterResistanceUnit,
    sensors: model.sensors,
    caseMaterial: model.caseMaterial,
    weightMg: model.weightMg,
    releaseDate: model.releaseDate.toISOString(),
    createdBy: model.createdBy.toString(),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
    stopSelling: model.stopSelling,
  };
}

export function formatModelVariationResponse(
  variation: any
): ModelVariationResponse {
  const type = variation.type;
  const formattedVariation: any = {};

  // Common fields for all types
  Object.assign(formattedVariation, {
    id: variation._id.toString(),
    productModelId: variation.productModelId.toString(),
    type,
    name: variation.name,
    colorHex: variation.colorHex,
    imageUrls: variation.imageUrls,
    stockQuantity: variation.stockQuantity,
    createdBy: variation.createdBy.toString(),
    createdAt: variation.createdAt.toISOString(),
    updatedAt: variation.updatedAt.toISOString(),
    stopSelling: variation.stopSelling,
  });

  // Specific fields for each type
  if (type === "color") {
    formattedVariation.additionalPriceCents = variation.additionalPriceCents;
  } else if (type === "band") {
    Object.assign(formattedVariation, {
      material: variation.material,
      sizeMm: variation.sizeMm,
      weightMg: variation.weightMg,
      priceCents: variation.priceCents,
      basePriceCents: variation.basePriceCents,
    });
  }

  return formattedVariation;
}

export function formatVariationInstanceResponse(
  instance: any
): VariationInstanceResponse {
  return {
    id: instance._id.toString(),
    sku: instance.sku,
    modelVariationId: instance.modelVariationId.toString(),
    supplierSerialNumber: instance.supplierSerialNumber,
    supplierImeiNumber: instance.supplierImeiNumber,
    conditionId: instance.conditionId.toString(),
    isActive: instance.isActive,
    inactiveAt: instance.inactiveAt
      ? instance.inactiveAt.toISOString()
      : undefined,
    createdAt: instance.createdAt.toISOString(),
    updatedAt: instance.updatedAt.toISOString(),
  };
}

export function formatProviderResponse(provider: any): ProviderResponse {
  return {
    id: provider._id.toString(),
    fullName: provider.fullName,
    email: provider.email,
    phoneNumber: provider.phoneNumber,
    createdBy: provider.createdBy.toString(),
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

export function formatOrderResponse(order: any): OrderResponse {
  return {
    id: order._id.toString(),
    userId: order.userId.toString(),
    items: order.items.map((item: any) => ({
      variationId: item.variationId.toString(),
      quantity: item.quantity,
      totalCents: item.totalCents,
      instanceIds: item.instanceIds.map((instance: any) => ({
        id: instance.id.toString(),
        sku: instance.sku,
      })),
    })),
    totalCents: order.totalCents,
    deliveryStateId: order.deliveryStateId.toString(),
    estimateReceivedDate: order.estimateReceivedDate.toISOString(),
    receivedDate: order.receivedDate
      ? order.receivedDate.toISOString()
      : undefined,
    deliveryAddress: order.deliveryAddress,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
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