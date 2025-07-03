import { Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYSTEM_USER } from "./configs";
import InstanceCondition from "../models/product/instanceCondition.model";
import InventoryMovementType from "../models/inventory/inventoryMovementType.model";

type KeyObjectId = {
  [key: string]: Types.ObjectId;
};

type AppCache = {
  buyerRoleId?: Types.ObjectId;
  systemUserId?: Types.ObjectId;
  instanceConditions?: KeyObjectId;
  inventoryMovementTypes?: KeyObjectId;
};

export const appCache: AppCache = {};

export async function initAppCache(): Promise<void> {
  console.log("🗂️ ", "Initializing application cache...");
  try {
    const buyerRole = await Role.findOne({ name: "buyer" }).select("_id").lean();
    if (!buyerRole) {
      throw new Error("FATAL ERROR: 'buyer' role not found in the database.");
    }
    appCache.buyerRoleId = buyerRole._id;

    const systemUser = await User.findOne({ email: SYSTEM_USER.email }).select("_id").lean();
    if (!systemUser) {
      throw new Error(`FATAL ERROR: 'system' user not found in the database.`);
    }
    appCache.systemUserId = systemUser._id;

    await instanceConditionsCache();

    await inventoryMovementTypesCache();

    console.log("✅ Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing application cache:", error);
    process.exit(1);
  }
}

async function instanceConditionsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing instance conditions cache...");
  try {
    const conditions = await InstanceCondition.find().select("_id name").lean();
    if (!conditions || conditions.length === 0) {
      throw new Error("FATAL ERROR: No instance conditions found in the database.");
    }
    appCache.instanceConditions = conditions.reduce((acc, condition) => {
      acc[condition.name] = condition._id;
      return acc;
    }, {} as KeyObjectId);

    console.log("✅ Instance conditions cache initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing instance conditions cache:", error);
    process.exit(1);
  }
}

async function inventoryMovementTypesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing inventory movement types cache...");
  try {
    const movementTypes = await InventoryMovementType.find().select("_id name").lean();
    if (!movementTypes || movementTypes.length === 0) {
      throw new Error("FATAL ERROR: No inventory movement types found in the database.");
    }
    appCache.inventoryMovementTypes = movementTypes.reduce((acc, type) => {
      acc[type.name] = type._id;
      return acc;
    }, {} as KeyObjectId);

    console.log("✅ Inventory movement types cache initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing inventory movement types cache:", error);
    process.exit(1);
  }
}