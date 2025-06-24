import { Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYSTEM_USER } from "./configs";

type AppCache = {
  buyerRoleId: Types.ObjectId | null;
  systemUserId: Types.ObjectId | null;
};

export const appCache: AppCache = {
  buyerRoleId: null,
  systemUserId: null,
};

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

    console.log("✅ Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ Error initializing application cache:", error);
    process.exit(1);
  }
}