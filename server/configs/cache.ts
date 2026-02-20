import { FlattenMaps, Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYS_ADMIN_ROLE, SYS_BUYER_ROLE, SYSTEM_USER } from "./configs";
import InstanceCondition from "../models/product/instanceCondition.model";
import InventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
import paymentState from "../models/order/paymentState.model";
import paymentMethod from "../models/order/paymentMethod.model";
import RefundState from "../models/returnRefund/refundState.model";
import ReturnState from "../models/returnRefund/returnState.model";
import type { LookupIdObjectId } from "../utils/types";
import PickupState from "../models/returnRefund/pickupState.model";
import OrderState from "../models/order/orderState.model";
import WithdrawalState from "../models/withdrawal/withdrawalState.model";
import GrnState from "../models/inventory/grnState.model";
import Permission, { IPermission } from "../models/role/permission.model";

type LookupIdObjectIdWithLevel = {
  [lookupId: string]: {
    id: Types.ObjectId;
    level: number;
  };
};

type AppCache = {
  systemUserId?: Types.ObjectId;

  instanceConditions?: LookupIdObjectId;
  inventoryMovementTypes?: LookupIdObjectId;

  deliveryStates?: LookupIdObjectIdWithLevel;
  paymentStates?: LookupIdObjectId;
  orderStates?: LookupIdObjectIdWithLevel;
  pickupStates?: LookupIdObjectIdWithLevel;
  paymentMethods?: LookupIdObjectId;

  refundStates?: LookupIdObjectId;
  returnStates?: LookupIdObjectIdWithLevel;

  withdrawalStates?: LookupIdObjectIdWithLevel;

  grnStates?: LookupIdObjectId;

  permissions?: (FlattenMaps<IPermission> &
    Required<{
      _id: Types.ObjectId;
    }> & {
      __v: number;
    })[];

  sysBuyerRoleId?: Types.ObjectId;
  sysAdminRoleId?: Types.ObjectId;
};

export const appCache: AppCache = {};

async function sysUserIdCache(): Promise<void> {
  console.log("🗂️ ", "Initializing system user ID cache...");
  try {
    const systemUser = await User.findOne({ email: SYSTEM_USER.email })
      .select("_id")
      .lean();
    if (!systemUser) {
      throw new Error(`'system' user not found in the database.`);
    }
    appCache.systemUserId = systemUser._id;
    console.log("✅ ", "System user ID cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing system user ID cache: ${error}`);
  }
}

async function instanceConditionsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing instance conditions cache...");

  try {
    const conditions = await InstanceCondition.find()
      .select("_id lookupId")
      .lean();
    if (!conditions || conditions.length === 0) {
      throw new Error("No instance conditions found in the database.");
    }

    appCache.instanceConditions = conditions.reduce((acc, condition) => {
      acc[condition.lookupId] = condition._id;
      return acc;
    }, {} as LookupIdObjectId);

    console.log("✅ ", "Instance conditions cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing instance conditions cache: ${error}`);
  }
}

async function inventoryMovementTypesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing inventory movement types cache...");

  try {
    const movementTypes = await InventoryMovementType.find()
      .select("_id lookupId")
      .lean();
    if (!movementTypes || movementTypes.length === 0) {
      throw new Error("No inventory movement types found in the database.");
    }
    appCache.inventoryMovementTypes = movementTypes.reduce((acc, type) => {
      acc[type.lookupId] = type._id;
      return acc;
    }, {} as LookupIdObjectId);

    console.log(
      "✅ ",
      "Inventory movement types cache initialized successfully.",
    );
  } catch (error) {
    throw new Error(
      `Error initializing inventory movement types cache: ${error}`,
    );
  }
}

async function deliveryStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing delivery states cache...");
  try {
    const deliveryStates = await DeliveryState.find()
      .select("_id lookupId level")
      .lean();
    if (!deliveryStates || deliveryStates.length === 0) {
      throw new Error("No delivery states found in the database.");
    }
    appCache.deliveryStates = deliveryStates.reduce((acc, state) => {
      acc[state.lookupId] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as LookupIdObjectIdWithLevel);

    console.log("✅ ", "Delivery states cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing delivery states cache: ${error}`);
  }
}

async function paymentStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment state cache...");
  try {
    const states = await paymentState.find().select("_id lookupId").lean();
    if (!states || states.length === 0) {
      throw new Error("No payment states found in the database.");
    }
    appCache.paymentStates = states.reduce((acc, state) => {
      acc[state.lookupId] = state._id;
      return acc;
    }, {} as LookupIdObjectId);

    console.log("✅ ", "Payment state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment state cache: ${error}`);
  }
}

async function orderStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing order state cache...");
  try {
    const states = await OrderState.find().select("_id lookupId level").lean();
    if (!states || states.length === 0) {
      throw new Error("No order states found in the database.");
    }
    appCache.orderStates = states.reduce((acc, state) => {
      acc[state.lookupId] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as LookupIdObjectIdWithLevel);
    console.log("✅ ", "Order state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing order state cache: ${error}`);
  }
}

async function paymentMethodsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment method cache...");
  try {
    const methods = await paymentMethod.find().select("_id lookupId").lean();
    if (!methods || methods.length === 0) {
      throw new Error("No payment methods found in the database.");
    }
    appCache.paymentMethods = methods.reduce((acc, method) => {
      acc[method.lookupId] = method._id;
      return acc;
    }, {} as LookupIdObjectId);

    console.log("✅ ", "Payment method cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment method cache: ${error}`);
  }
}

async function refundStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing refund state cache...");
  try {
    const states = await RefundState.find().select("_id lookupId").lean();
    if (!states || states.length === 0) {
      throw new Error("No refund states found in the database.");
    }

    appCache.refundStates = states.reduce((acc, state) => {
      acc[state.lookupId] = state._id;
      return acc;
    }, {} as LookupIdObjectId);
    console.log("✅ ", "Refund state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing refund state cache: ${error}`);
  }
}

async function returnStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing return state cache...");
  try {
    const states = await ReturnState.find().select("_id lookupId level").lean();
    if (!states || states.length === 0) {
      throw new Error("No return states found in the database.");
    }

    appCache.returnStates = states.reduce((acc, state) => {
      acc[state.lookupId] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as LookupIdObjectIdWithLevel);
    console.log("✅ ", "Return state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing return state cache: ${error}`);
  }
}

async function pickupStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing pickup state cache...");
  try {
    const states = await PickupState.find().select("_id lookupId level").lean();
    if (!states || states.length === 0) {
      throw new Error("No pickup states found in the database.");
    }

    appCache.pickupStates = states.reduce((acc, state) => {
      acc[state.lookupId] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as LookupIdObjectIdWithLevel);
    console.log("✅ ", "Pickup state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing pickup state cache: ${error}`);
  }
}

async function withdrawalStateCache(): Promise<void> {
  console.log("🗂️ ", "Initializing withdrawal state cache...");
  try {
    const states = await WithdrawalState.find()
      .select("_id lookupId level")
      .lean();
    if (!states || states.length === 0) {
      throw new Error("No pickup states found in the database.");
    }

    appCache.withdrawalStates = states.reduce((acc, state) => {
      acc[state.lookupId] = {
        id: state._id,
        level: state.level,
      };
      return acc;
    }, {} as LookupIdObjectIdWithLevel);
    console.log("✅ ", "Withdrawal state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing withdrawal state cache: ${error}`);
  }
}

async function grnStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing GRN states cache...");

  try {
    const states = await GrnState.find().select("_id lookupId").lean();
    if (!states || states.length === 0) {
      throw new Error("No GRN states found in the database.");
    }
    appCache.grnStates = states.reduce((acc, state) => {
      acc[state.lookupId] = state._id;
      return acc;
    }, {} as LookupIdObjectId);

    console.log("✅ ", "GRN states cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing GRN states cache: ${error}`);
  }
}

async function permissionsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing permissions cache...");

  try {
    const permissions = await Permission.find().lean();
    if (!permissions || permissions.length === 0) {
      throw new Error("No permissions found in the database.");
    }

    appCache.permissions = permissions;

    console.log("✅ ", "Permissions cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing permissions cache: ${error}`);
  }
}

async function sysRoleIdsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing system roles ID cache...")

  try {
    const baseRoles = await Role.find({
      name: { $in: [SYS_BUYER_ROLE.name, SYS_ADMIN_ROLE.name] },
    })
      .select("_id name")
      .lean();

    if (!baseRoles || baseRoles.length === 0) {
      throw new Error("System roles not found in the database.");
    }

    baseRoles.forEach((role) => {
      if (role.name === SYS_BUYER_ROLE.name) {
        appCache.sysBuyerRoleId = role._id;
      } else if (role.name === SYS_ADMIN_ROLE.name) {
        appCache.sysAdminRoleId = role._id;
      }
    });

    if (!appCache.sysBuyerRoleId) {
      throw new Error("System buyer role not found in the database.");
    }
    if (!appCache.sysAdminRoleId) {
      throw new Error("system admin role not found in the database.");
    }

    console.log("✅ ", "Base roles ID cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing base role ID cache: ${error}`);
  }
}

export async function initAppCache(): Promise<void> {
  console.log("🗂️ ", "Initializing application cache...");

  try {
    await Promise.all([
      sysRoleIdsCache(),
      sysUserIdCache(),

      instanceConditionsCache(),
      inventoryMovementTypesCache(),

      deliveryStatesCache(),
      paymentStatesCache(),
      orderStatesCache(),
      pickupStatesCache(),

      paymentMethodsCache(),

      refundStatesCache(),
      returnStatesCache(),

      withdrawalStateCache(),

      grnStatesCache(),

      permissionsCache(),
    ]);

    console.log("✅ ", "Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ ", "Error initializing application cache:", error);
    process.exit(1);
  }
}
