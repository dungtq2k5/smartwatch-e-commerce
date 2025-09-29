import {
  AVATAR_ALLOWED_TYPES,
  ORDER_RETURN_IMG_ALLOWED_TYPES,
  PRODUCT_IMAGE_ALLOWED_TYPES,
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
  PaymentMethodResponse,
  UserSelfPaymentMethodResponse,
  DeliveryStateResponse,
  PaymentStateResponse,
  OrderReturnResponse,
  OrderStateResponse,
  OrderDetailResponse,
  ReturnStateResponse,
  RefundStateResponse,
  PickupStateResponse,
  ReturnReasonResponse,
  OrderReturnDetailResponse,
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

export async function isValidImgUrl(
  url: any,
  category: "order return" | "product" | "avatar"
): Promise<boolean> {
  if (!isValidUrl(url)) return false;

  try {
    const res = await fetch(url, { method: "HEAD" }); // use HEAD request to get headers only
    if (!res.ok) return false;

    const contentType = res.headers.get("content-type");
    const ALLOWED_TYPES =
      category === "order return"
        ? ORDER_RETURN_IMG_ALLOWED_TYPES
        : category === "product"
        ? PRODUCT_IMAGE_ALLOWED_TYPES
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
  category: "order return" | "product" | "avatar"
): Promise<boolean> {
  if (!Array.isArray(imgUrls)) return false;

  for (const url of imgUrls) {
    if (!(await isValidImgUrl(url, category))) return false;
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
    canReturn: order.canReturn,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function formatOrderDetailResponse(order: any): OrderDetailResponse {
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
  method: any
): PaymentMethodResponse {
  return {
    id: method._id,
    lookupId: method.lookupId,
    name: method.name,
    description: method.description,
  };
}

export function formatUserSelfPaymentMethodResponse(
  method: any
): UserSelfPaymentMethodResponse {
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

export function formatDeliveryStateResponse(state: any): DeliveryStateResponse {
  return {
    id: state._id,
    lookupId: state.lookupId,
    name: state.name,
    level: state.level,
  };
}

export function formatPaymentStateResponse(state: any): PaymentStateResponse {
  return {
    id: state._id,
    lookupId: state.lookupId,
    name: state.name,
  };
}

export function formatOrderReturnResponse(
  orderReturn: any
): OrderReturnResponse {
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
    transaction: orderReturn.transaction,
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

export function formatOrderReturnDetailResponse(
  orderReturn: any
): OrderReturnDetailResponse {
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

export function formatOrderStateResponse(state: any): OrderStateResponse {
  return formatDeliveryStateResponse(state);
}

export function formatPickupStateResponse(state: any): PickupStateResponse {
  return formatDeliveryStateResponse(state);
}

export function formatReturnStateResponse(state: any): ReturnStateResponse {
  return formatOrderStateResponse(state);
}

export function formatRefundStateResponse(state: any): RefundStateResponse {
  return formatPaymentStateResponse(state);
}

export function formatReturnReason(reason: any): ReturnReasonResponse {
  return {
    id: reason._id,
    name: reason.name,
    description: reason.description,
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
      `Condition with lookupId '${lookupId}' not found in cache.`
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
      `Movement type with lookupId '${lookupId}' not found in cache.`
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
      `Delivery state with lookupId '${lookupId}' not found in cache.`
    );
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

export function getDeliveryStateLookupId(stateId: Types.ObjectId): string {
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
      `Payment state with lookupId '${lookupId}' not found in cache.`
    );
  }

  return stateId;
}

export function getPaymentStateLookupId(stateId: Types.ObjectId): string {
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
      `Order state with lookupId '${lookupId}' not found in cache.`
    );
  }

  return state.id;
}

export function getOrderStateLookupId(stateId: Types.ObjectId): string {
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

export function getOrderStateLevel(stateId: Types.ObjectId): number {
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
      `Payment method with lookupId '${lookupId}' not found in cache.`
    );
  }

  return methodId;
}

export function getPaymentMethodLookupId(methodId: Types.ObjectId): string {
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
      `Refund state with lookupId '${lookupId}' not found in cache.`
    );
  }

  return stateId;
}

export function getRefundStateLookupId(stateId: Types.ObjectId): string {
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
      `Return state with lookupId '${lookupId}' not found in cache.`
    );
  }

  return state.id;
}

export function getReturnStateLevel(stateId: Types.ObjectId): number {
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

export function getReturnStateLookupId(stateId: Types.ObjectId): string {
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
      `Pickup state with lookupId '${lookupId}' not found in cache.`
    );
  }

  return state.id;
}

export function getPickupStateLevel(stateId: Types.ObjectId): number {
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

export function getPickupStateLookupId(stateId: Types.ObjectId): string {
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
