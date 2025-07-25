import { Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYSTEM_USER } from "./configs";
import InstanceCondition from "../models/product/instanceCondition.model";
import InventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
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
    // Assuming you have a DeliveryState model similar to the others
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

    console.log("✅ ", "Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ ", "Error initializing application cache:", error);
    process.exit(1);
  }
}
