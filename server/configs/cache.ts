import { Types } from "mongoose";
import Role from "../models/role/role.model";
import User from "../models/user/user.model";
import { SYS_ADMIN_ROLE, SYS_BUYER_ROLE, SYSTEM_USER } from "./configs";
import InstanceCondition, {
  IInstanceCondition,
} from "../models/product/instanceCondition.model";
import InventoryMovementType, {
  IInventoryMovementType,
} from "../models/inventory/inventoryMovementType.model";
import DeliveryState, {
  IDeliveryState,
} from "../models/order/deliveryState.model";
import PaymentState, {
  IPaymentState,
} from "../models/order/paymentState.model";
import paymentMethod, {
  IPaymentMethod,
} from "../models/order/paymentMethod.model";
import RefundState, {
  IRefundState,
} from "../models/returnRefund/refundState.model";
import ReturnState, {
  IReturnState,
} from "../models/returnRefund/returnState.model";
import type { LookupIdObjectId, States } from "../utils/types";
import PickupState, {
  IPickupState,
} from "../models/returnRefund/pickupState.model";
import OrderState, { IOrderState } from "../models/order/orderState.model";
import WithdrawalState, {
  IWithdrawalState,
} from "../models/withdrawal/withdrawalState.model";
import GrnState, { IGrnState } from "../models/inventory/grnState.model";
import Permission, { IPermission } from "../models/role/permission.model";
import ReturnReason, {
  IReturnReason,
} from "../models/returnRefund/returnReason.model";

type LookupIdObjectIdWithLevel = {
  [lookupId: string]: {
    id: Types.ObjectId;
    level: number;
  };
};

type AppCache = {
  systemUserId?: Types.ObjectId;

  instanceConditionLookupIds?: LookupIdObjectId;
  instanceConditions?: States<IInstanceCondition>;

  inventoryMovementTypeLookupIds?: LookupIdObjectId;
  inventoryMovementTypes?: States<IInventoryMovementType>;

  deliveryStateLookupIds?: LookupIdObjectIdWithLevel;
  deliveryStates?: States<IDeliveryState>;

  paymentStateLookupIds?: LookupIdObjectId;
  paymentStates?: States<IPaymentState>;

  orderStateLookupIds?: LookupIdObjectIdWithLevel;
  orderStates?: States<IOrderState>;

  paymentMethodLookupIds?: LookupIdObjectId;
  paymentMethods?: States<IPaymentMethod>;

  refundStateLookupIds?: LookupIdObjectId;
  refundStates?: States<IRefundState>;

  pickupStateLookupIds?: LookupIdObjectIdWithLevel;
  pickupStates?: States<IPickupState>;

  returnStateLookupIds?: LookupIdObjectIdWithLevel;
  returnStates?: States<IReturnState>;

  returnReasons?: States<IReturnReason>;

  withdrawalStateLookupIds?: LookupIdObjectIdWithLevel;
  withdrawalStates?: States<IWithdrawalState>;

  grnStateLookupIds?: LookupIdObjectId;
  grnStates?: States<IGrnState>;

  permissions?: States<IPermission>;

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

// Also cache instanceConditionLookupIds
async function instanceConditionsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing instance conditions cache...");

  try {
    const conditions = await InstanceCondition.find()
      .sort({ lookupId: 1 })
      .lean();
    if (conditions.length === 0) {
      throw new Error("No instance conditions found in the database.");
    }

    appCache.instanceConditions = conditions;
    appCache.instanceConditionLookupIds = conditions.reduce(
      (acc, condition) => {
        acc[condition.lookupId] = condition._id;
        return acc;
      },
      {} as LookupIdObjectId,
    );
    console.log("✅ ", "Instance conditions cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing instance conditions cache: ${error}`);
  }
}

// Also cache inventoryMovementTypeLookupIds
async function inventoryMovementTypesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing inventory movement types cache...");

  try {
    const movementTypes = await InventoryMovementType.find()
      .sort({ lookupId: 1 })
      .lean();
    if (movementTypes.length === 0) {
      throw new Error("No inventory movement types found in the database.");
    }

    appCache.inventoryMovementTypes = movementTypes;
    appCache.inventoryMovementTypeLookupIds = movementTypes.reduce(
      (acc, type) => {
        acc[type.lookupId] = type._id;
        return acc;
      },
      {} as LookupIdObjectId,
    );
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

// Also cache deliveryStateLookupIds
async function deliveryStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing delivery states cache...");

  try {
    const states = await DeliveryState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No delivery states found in the database.");
    }

    appCache.deliveryStates = states;
    appCache.deliveryStateLookupIds = states.reduce((acc, state) => {
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

// Also cache paymentStateLookupIds
async function paymentStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment state cache...");

  try {
    const states = await PaymentState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No payment states found in the database.");
    }

    appCache.paymentStates = states;
    appCache.paymentStateLookupIds = states.reduce((acc, state) => {
      acc[state.lookupId] = state._id;
      return acc;
    }, {} as LookupIdObjectId);
    console.log("✅ ", "Payment state cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment state cache: ${error}`);
  }
}

// Also cache orderStateLookupIds
async function orderStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing order state cache...");

  try {
    const states = await OrderState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No order states found in the database.");
    }

    appCache.orderStates = states;
    appCache.orderStateLookupIds = states.reduce((acc, state) => {
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

// Also cache paymentMethodLookupIds
async function paymentMethodsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing payment method cache...");

  try {
    const methods = await paymentMethod.find().sort({ lookupId: 1 }).lean();
    if (methods.length === 0) {
      throw new Error("No payment methods found in the database.");
    }

    appCache.paymentMethods = methods;
    appCache.paymentMethodLookupIds = methods.reduce((acc, method) => {
      acc[method.lookupId] = method._id;
      return acc;
    }, {} as LookupIdObjectId);
    console.log("✅ ", "Payment method cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing payment method cache: ${error}`);
  }
}

// Also cache returnStateLookupIds
async function refundStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing refund states cache...");

  try {
    const states = await RefundState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No refund states found in the database.");
    }

    appCache.refundStates = states;
    appCache.refundStateLookupIds = states.reduce((acc, state) => {
      acc[state.lookupId] = state._id;
      return acc;
    }, {} as LookupIdObjectId);
    console.log("✅ ", "Refund states cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing refund states cache: ${error}`);
  }
}

// Also cache returnStateLookupIds
async function pickupStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing pickup state cache...");

  try {
    const states = await PickupState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No pickup states found in the database.");
    }

    appCache.pickupStates = states;
    appCache.pickupStateLookupIds = states.reduce((acc, state) => {
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

// Also cache returnStateLookupIds
async function returnStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing return state cache...");

  try {
    const states = await ReturnState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No return states found in the database.");
    }

    appCache.returnStates = states;
    appCache.returnStateLookupIds = states.reduce((acc, state) => {
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

async function returnReasonsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing return reason cache...");
  try {
    const reasons = await ReturnReason.find().lean();
    if (reasons.length === 0) {
      throw new Error("No return reasons found in the database.");
    }

    appCache.returnReasons = reasons;
    console.log("✅ ", "Return reason cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing return reason cache: ${error}`);
  }
}

// Also cache withdrawalStateLookupIds
async function withdrawalStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing withdrawal state cache...");

  try {
    const states = await WithdrawalState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No pickup states found in the database.");
    }

    appCache.withdrawalStates = states;
    appCache.withdrawalStateLookupIds = states.reduce((acc, state) => {
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

// Also cache grnStateLookupIds
async function grnStatesCache(): Promise<void> {
  console.log("🗂️ ", "Initializing GRN states cache...");

  try {
    const states = await GrnState.find().sort({ lookupId: 1 }).lean();
    if (states.length === 0) {
      throw new Error("No GRN states found in the database.");
    }

    appCache.grnStates = states;
    appCache.grnStateLookupIds = states.reduce((acc, state) => {
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
    if (permissions.length === 0) {
      throw new Error("No permissions found in the database.");
    }

    appCache.permissions = permissions;

    console.log("✅ ", "Permissions cache initialized successfully.");
  } catch (error) {
    throw new Error(`Error initializing permissions cache: ${error}`);
  }
}

async function sysRoleIdsCache(): Promise<void> {
  console.log("🗂️ ", "Initializing system roles ID cache...");

  try {
    const baseRoles = await Role.find({
      name: { $in: [SYS_BUYER_ROLE.name, SYS_ADMIN_ROLE.name] },
    })
      .select("_id name")
      .lean();

    if (baseRoles.length === 0) {
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

      paymentMethodsCache(),

      refundStatesCache(),
      pickupStatesCache(),
      returnStatesCache(),
      returnReasonsCache(),

      withdrawalStatesCache(),

      grnStatesCache(),

      permissionsCache(),
    ]);

    console.log("✅ ", "Application cache initialized successfully.");
  } catch (error) {
    console.error("❌ ", "Error initializing application cache:", error);
    process.exit(1);
  }
}
