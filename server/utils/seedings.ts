import User from "../models/user/user.model";
import {
  HASH_SALT,
  SYSTEM_USER,
  PERMISSION_LIST,
  BUYER_PERMISSION_LIST,
  ADMIN_USER,
} from "../configs/configs";
import bcrypt from "bcryptjs";
import GrnStatus from "../models/inventory/grnStatus.model";
import inventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
import PaymentMethod from "../models/order/paymentMethod.model";
import PaymentStatus from "../models/order/paymentStatus.model";
import InstanceCondition from "../models/product/instanceCondition.model";
import RefundStatus from "../models/returnRefund/refundStatus.model";
import ReturnStatus from "../models/returnRefund/returnStatus.model";
import ReturnReason from "../models/returnRefund/returnReason.model";
import Permission from "../models/role/permission.model";
import Role from "../models/role/role.model";
import mongoose from "mongoose";

export async function createSystemUser(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const systemUser = await User.findOne({ email: SYSTEM_USER.email });
    if (systemUser) {
      console.log("System user already exists, no need to create.");
      return;
    }

    const hashedPassword = await bcrypt.hash(SYSTEM_USER.password, HASH_SALT);
    const newSystemUser = await User.create({
      fullName: SYSTEM_USER.fullName,
      email: SYSTEM_USER.email,
      password: hashedPassword,
      isEmailVerified: true,
    });
    console.log("🫘 ", "System user created successfully:", newSystemUser._id);
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error creating system user:", error);
    process.exit(1);
  }
}

export async function seedGrnStatuses(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await GrnStatus.countDocuments();

    if (count !== 0) {
      console.log("GrnStatuses already exist, no seeding needed.");
      return;
    }
    const grnStatuses = [
      { lookupId: 1, name: "completed" },
      { lookupId: 2, name: "reversal" },
      { lookupId: 3, name: "draft" },
    ];
    await GrnStatus.insertMany(grnStatuses);
    console.log("🫘 ", "GrnStatuses seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding GrnStatuses:", error);
    process.exit(1);
  }
}

export async function seedInventoryMovementTypes(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await inventoryMovementType.countDocuments();

    if (count !== 0) {
      console.log("InventoryMovementTypes already exist, no seeding needed.");
      return;
    }
    const movementTypes = [
      {
        lookupId: 1,
        name: "goods receipt",
        description: "Incoming stock from supplier.",
      },
      {
        lookupId: 2,
        name: "grn cancellation",
        description: "Reversal of a good receipt notes.",
      },
      {
        lookupId: 3,
        name: "sales out",
        description: "Outgoing stock due to a sale.",
      },
      {
        lookupId: 4,
        name: "stock adjustment",
        description: "Manually increase/decrease in stock.",
      },
      {
        lookupId: 5,
        name: "stock transfer",
        description: "Transfer of stock between locations.",
      },
      {
        lookupId: 6,
        name: "damaged stock",
        description: "Stock that is damaged and needs to be written off.",
      },
      {
        lookupId: 7,
        name: "return to supplier",
        description: "Returning stock to the supplier.",
      },
      {
        lookupId: 8,
        name: "return from customer",
        description: "Stock returned from a customer.",
      },
      {
        lookupId: 9,
        name: "stock audit",
        description: "Stock audit adjustments.",
      },
      {
        lookupId: 10,
        name: "other",
        description: "Any other type of inventory movement.",
      },
    ];
    await inventoryMovementType.insertMany(movementTypes);
    console.log("🫘 ", "InventoryMovementTypes seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding InventoryMovementTypes:", error);
    process.exit(1);
  }
}

export async function seedDeliveryStates(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await DeliveryState.countDocuments();

    if (count !== 0) {
      console.log("DeliveryStates already exist, no seeding needed.");
      return;
    }
    const deliveryStates = [
      { lookupId: 1, name: "order places" },
      { lookupId: 2, name: "order confirmed" },
      { lookupId: 3, name: "processing" },
      { lookupId: 4, name: "shipped" },
      { lookupId: 5, name: "out for delivery" },
      { lookupId: 6, name: "delivered" },
      { lookupId: 7, name: "received" },
      { lookupId: 8, name: "cancelled" },
      { lookupId: 9, name: "returned" },
    ];
    await DeliveryState.insertMany(deliveryStates);
    console.log("🫘 ", "DeliveryStates seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding DeliveryStates:", error);
    process.exit(1);
  }
}

export async function seedPaymentMethods(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await PaymentMethod.countDocuments();

    if (count !== 0) {
      console.log("PaymentMethods already exist, no seeding needed.");
      return;
    }
    const paymentMethods = [
      { lookupId: 1, name: "cash" },
      { lookupId: 2, name: "credit card" },
      { lookupId: 3, name: "debit card" },
      { lookupId: 4, name: "bank transfer" },
      { lookupId: 5, name: "mobile payment" },
      { lookupId: 6, name: "user balance" },
    ];
    await PaymentMethod.insertMany(paymentMethods);
    console.log("🫘 ", "PaymentMethods seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding PaymentMethods:", error);
    process.exit(1);
  }
}

export async function seedPaymentStatus(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await PaymentStatus.countDocuments();

    if (count !== 0) {
      console.log("PaymentStatuses already exist, no seeding needed.");
      return;
    }
    const paymentStatuses = [
      { lookupId: 1, name: "pending" },
      { lookupId: 2, name: "paid" },
      { lookupId: 3, name: "failed" },
      { lookupId: 4, name: "refunded" },
      { lookupId: 5, name: "cancelled" },
    ];
    await PaymentStatus.insertMany(paymentStatuses);
    console.log("🫘 ", "PaymentStatuses seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding PaymentStatuses:", error);
    process.exit(1);
  }
}

export async function seedInstanceConditions(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await InstanceCondition.countDocuments();

    if (count !== 0) {
      console.log("InstanceConditions already exist, no seeding needed.");
      return;
    }
    const instanceConditions = [
      { lookupId: 1, name: "new" },
      { lookupId: 2, name: "used" },
      { lookupId: 3, name: "refurbished" },
      { lookupId: 4, name: "defective" },
    ];
    await InstanceCondition.insertMany(instanceConditions);
    console.log("🫘 ", "InstanceConditions seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding InstanceConditions:", error);
    process.exit(1);
  }
}

export async function seedRefundStatus(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await RefundStatus.countDocuments();

    if (count !== 0) {
      console.log("RefundStatuses already exist, no seeding needed.");
      return;
    }
    const refundStatuses = [
      { lookupId: 1, name: "pending" },
      { lookupId: 2, name: "refunded" },
      { lookupId: 3, name: "failed" },
      { lookupId: 4, name: "canceled" },
      { lookupId: 5, name: "rejected" },
    ];
    await RefundStatus.insertMany(refundStatuses);
    console.log("🫘 ", "RefundStatuses seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding RefundStatuses:", error);
    process.exit(1);
  }
}

export async function seedReturnStatuses(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await ReturnStatus.countDocuments();

    if (count !== 0) {
      console.log("ReturnStatuses already exist, no seeding needed.");
      return;
    }
    const returnStatuses = [
      { lookupId: 1, name: "pending" },
      { lookupId: 2, name: "received" },
      { lookupId: 3, name: "approved" },
      { lookupId: 4, name: "declined" },
      { lookupId: 5, name: "refund pending" },
      { lookupId: 6, name: "refunded" },
      { lookupId: 7, name: "cancelled" },
    ];
    await ReturnStatus.insertMany(returnStatuses);
    console.log("🫘 ", "ReturnStatuses seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding ReturnStatuses:", error);
    process.exit(1);
  }
}

export async function seedReturnReasons(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await ReturnReason.countDocuments();

    if (count !== 0) {
      console.log("ReturnReasons already exist, no seeding needed.");
      return;
    }
    const returnReasons = [
      { lookupId: 1, name: "defective item" },
      { lookupId: 2, name: "wrong item" },
      { lookupId: 3, name: "item not as described" },
      { lookupId: 4, name: "item not fit" },
      { lookupId: 5, name: "quality issues" },
      { lookupId: 6, name: "other" },
    ];
    await ReturnReason.insertMany(returnReasons);
    console.log("🫘 ", "ReturnReasons seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding ReturnReasons:", error);
    process.exit(1);
  }
}

export async function seedPermissions(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const count = await Permission.countDocuments();

    if (count !== 0) {
      console.log("Permissions already exist, no seeding needed.");
      return;
    }
    await Permission.insertMany(PERMISSION_LIST);
    console.log("🫘 ", "Permissions seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding Permissions:", error);
    process.exit(1);
  }
}

export async function seedRoles(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const roleCount = await Role.countDocuments();
    if (roleCount !== 0) {
      console.log("Roles already exist, no seeding needed.");
      return;
    }

    const permissionCount = await Permission.countDocuments();
    if (permissionCount === 0) {
      console.log("No permissions found, seeding permissions first...");
      await seedPermissions(session);
    }

    const systemUser = await User.findOne({ email: SYSTEM_USER.email });
    if (!systemUser) {
      console.log("No system user found, creating system user first...");
      await createSystemUser(session);
    }
    const systemUserId = (await User.findOne({ email: SYSTEM_USER.email }))!
      ._id;

    const permissions = await Permission.find().select("_id code");

    const buyerPermissionCodes: string[] = BUYER_PERMISSION_LIST.map(
      (p) => p.code
    );
    const buyerPermissionIds = permissions
      .filter((p) => buyerPermissionCodes.includes(p.code))
      .map((p) => ({ id: p._id }));

    const roles = [
      {
        name: "admin",
        createdBy: systemUserId,
        permissions: permissions.map((p) => ({ id: p._id })),
      },
      {
        name: "buyer",
        createdBy: systemUserId,
        permissions: buyerPermissionIds,
      },
    ];

    await Role.insertMany(roles);
    console.log("🫘 ", "Roles seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error seeding Roles:", error);
    process.exit(1);
  }
}

export async function createBaseAdminUser(
  session: mongoose.mongo.ClientSession
): Promise<void> {
  try {
    const adminUser = await User.findOne({ email: ADMIN_USER.email });
    if (adminUser) {
      console.log("Base admin user already exists, no need to create.");
      return;
    }

    const existSystemUser = await User.findOne({ email: SYSTEM_USER.email });
    if (!existSystemUser) {
      console.log("No system user found, creating system user first...");
      await createSystemUser(session);
    }

    const roleCount = await Role.countDocuments();
    if (roleCount === 0) {
      console.log("No roles found, seeding roles first...");
      await seedRoles(session);
    }

    const adminRole = (await Role.findOne({ name: "admin" }))!;
    adminRole.userAssigned += 1;
    await adminRole.save();

    const systemUser = (await User.findOne({ email: SYSTEM_USER.email }).select(
      "_id"
    ))!;

    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, HASH_SALT);
    const newAdminUser = await User.create({
      fullName: ADMIN_USER.fullName,
      email: ADMIN_USER.email,
      password: hashedPassword,
      isEmailVerified: true,
      roles: [{ id: adminRole._id, assignedBy: systemUser._id }],
    });
    console.log(
      "🫘 ",
      "Base admin user created successfully:",
      newAdminUser._id
    );
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error("❌", "Error creating base admin user:", error);
    process.exit(1);
  }
}

export async function seedAllCollections(): Promise<void> {
  console.log("🫘 ", "Seeding collections...");

  const session = await mongoose.startSession();
  session.startTransaction();

  await createSystemUser(session);
  await seedGrnStatuses(session);
  await seedInventoryMovementTypes(session);
  await seedDeliveryStates(session);
  await seedPaymentMethods(session);
  await seedPaymentStatus(session);
  await seedInstanceConditions(session);
  await seedRefundStatus(session);
  await seedReturnStatuses(session);
  await seedReturnReasons(session);
  await seedPermissions(session);
  await seedRoles(session);
  await createBaseAdminUser(session);

  await session.commitTransaction();
  session.endSession();

  console.log("🫘 ", "All collections seeded successfully!");
}
