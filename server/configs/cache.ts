import { Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYSTEM_USER } from "./configs";
import InstanceCondition from "../models/product/instanceCondition.model";
import InventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
import paymentStatus from "../models/order/paymentStatus.model";
import paymentMethod from "../models/order/paymentMethod.model";
import type { KeyObjectId } from "../utils/types";

type KeyObjectIdWithLevel = {
  [key: string]: {
    id: Types.ObjectId;
    level: number;
  };
};

type AppCache = {
  buyerRoleId?: Types.ObjectId;
  adminRoleId?: Types.ObjectId;
  systemUserId?: Types.ObjectId;
  instanceConditions?: KeyObjectId;
  inventoryMovementTypes?: KeyObjectId;
  deliveryStates?: KeyObjectIdWithLevel;
  paymentStatuses?: KeyObjectId;
  paymentMethods?: KeyObjectId;
};

export const appCache: AppCache = {};

async function instanceConditionsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing instance conditions cache...");

  try {
    const conditions = await InstanceCondition.find().select("_id name").lean();
    if (!conditions || conditions.length === 0) {
      throw new Error("No instance conditions found in the database.");
    }

    appCache.instanceConditions = conditions.reduce((acc, condition) => {
      acc[condition.name] = condition._id;
      return acc;
    }, {} as KeyObjectId);

    console.log("✅ ", "Instance conditions cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing instance conditions cache: ${error}`);
  }
}

async function inventoryMovementTypesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing inventory movement types cache...");

  try {
    const movementTypes = await InventoryMovementType.find()
      .select("_id name")
      .lean();
    if (!movementTypes || movementTypes.length === 0) {
      throw new Error("No inventory movement types found in the database.");
    }
    appCache.inventoryMovementTypes = movementTypes.reduce((acc, type) => {
      acc[type.name] = type._id;
      return acc;
    }, {} as KeyObjectId);

    console.log(
      "✅ ",
      "Inventory movement types cache initialized successfully."
    );
  } catch (error) {
    throw new Error(
      `Error initializing inventory movement types cache: ${error}`
    );
  }
}

async function deliveryStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing delivery states cache...");
  try {
    const deliveryStates = await DeliveryState.find()
      .select("_id name level")
      .lean();
    if (!deliveryStates || deliveryStates.length === 0) {
      throw new Error("No delivery states found in the database.");
    }
    appCache.deliveryStates = deliveryStates.reduce((acc, state) => {
      acc[state.name] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as KeyObjectIdWithLevel);

    console.log("✅ ", "Delivery states cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing delivery states cache: ${error}`);
  }
}

async function paymentStatusCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment status cache...");
  try {
    const statuses = await paymentStatus.find().select("_id name").lean();
    if (!statuses || statuses.length === 0) {
      throw new Error("No payment statuses found in the database.");
    }
    appCache.paymentStatuses = statuses.reduce((acc, status) => {
      acc[status.name] = status._id;
      return acc;
    }, {} as KeyObjectId);

    console.log("✅ ", "Payment status cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment status cache: ${error}`);
  }
}

async function paymentMethodCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment method cache...");
  try {
    const methods = await paymentMethod.find().select("_id name").lean();
    if (!methods || methods.length === 0) {
      throw new Error("No payment methods found in the database.");
    }
    appCache.paymentMethods = methods.reduce((acc, method) => {
      acc[method.name] = method._id;
      return acc;
    }, {} as KeyObjectId);

    console.log("✅ ", "Payment method cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment method cache: ${error}`);
  }
}

export async function initAppCache(): Promise<void> {
  console.log("🗂️ ", "Initializing application cache...");

  try {
    const buyerRole = await Role.findOne({ name: "buyer" })
      .select("_id")
      .lean();
    if (!buyerRole) {
      throw new Error("'buyer' role not found in the database.");
    }
    appCache.buyerRoleId = buyerRole._id;

    const adminRole = await Role.findOne({ name: "admin" })
      .select("_id")
      .lean();
    if (!adminRole) {
      throw new Error("'admin' role not found in the database.");
    }
    appCache.adminRoleId = adminRole._id;

    const systemUser = await User.findOne({ email: SYSTEM_USER.email })
      .select("_id")
      .lean();
    if (!systemUser) {
      throw new Error(`'system' user not found in the database.`);
    }
    appCache.systemUserId = systemUser._id;

    await instanceConditionsCache();
    await inventoryMovementTypesCache();
    await deliveryStatesCache();
    await paymentStatusCache();
    await paymentMethodCache();

    console.log("✅ ", "Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ ", "Error initializing application cache:", error);
    process.exit(1);
  }
}
