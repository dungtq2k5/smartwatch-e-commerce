import User from "../models/user/user.model";
import { genRandomPassword } from "../../common/utils.common";
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
    const systemUser = await User.findOne({ email: SYSTEM_USER.email }).session(
      session
    );
    if (systemUser) {
      console.log("System user already exists, no need to create.");
      return;
    }

    const hashedPassword = await bcrypt.hash(genRandomPassword(), HASH_SALT);
    await User.create(
      [
        {
          fullName: SYSTEM_USER.fullName,
          email: SYSTEM_USER.email,
          password: hashedPassword,
          birth: new Date(),
          gender: SYSTEM_USER.gender,
          isEmailVerified: true,
        },
      ],
      { session }
    );
    console.log("🫘 ", "System user created successfully");
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
    const count = await GrnStatus.countDocuments().session(session);

    if (count !== 0) {
      console.log("GrnStatuses already exist, no seeding needed.");
      return;
    }
    const grnStatuses = [
      { name: "completed" },
      { name: "reversal" },
      { name: "draft" },
    ];
    await GrnStatus.insertMany(grnStatuses, { session });
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
    const count = await inventoryMovementType.countDocuments().session(session);

    if (count !== 0) {
      console.log("InventoryMovementTypes already exist, no seeding needed.");
      return;
    }
    const movementTypes = [
      {
        name: "goods receipt",
        description: "Incoming stock from supplier.",
      },
      {
        name: "grn cancellation",
        description: "Reversal of a good receipt notes.",
      },
      {
        name: "sales out",
        description: "Outgoing stock due to a sale.",
      },
      {
        name: "stock adjustment",
        description: "Manually increase/decrease in stock.",
      },
      {
        name: "stock transfer",
        description: "Transfer of stock between locations.",
      },
      {
        name: "damaged stock",
        description: "Stock that is damaged and needs to be written off.",
      },
      {
        name: "return to supplier",
        description: "Returning stock to the supplier.",
      },
      {
        name: "return from customer",
        description: "Stock returned from a customer.",
      },
      {
        name: "stock audit",
        description: "Stock audit adjustments.",
      },
      {
        name: "other",
        description: "Any other type of inventory movement.",
      },
    ];
    await inventoryMovementType.insertMany(movementTypes, { session });
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
    const count = await DeliveryState.countDocuments().session(session);

    if (count !== 0) {
      console.log("DeliveryStates already exist, no seeding needed.");
      return;
    }
    const deliveryStates = [
      { name: "order places", level: 1 },
      { name: "order confirmed", level: 2 },
      { name: "processing", level: 3 },
      { name: "shipped", level: 4 },
      { name: "out for delivery", level: 5 },
      { name: "delivered", level: 6 },
      { name: "received", level: 7 },
      { name: "cancelled", level: 8 },
      { name: "returned", level: 9 },
    ];
    await DeliveryState.insertMany(deliveryStates, { session });
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
    const count = await PaymentMethod.countDocuments().session(session);

    if (count !== 0) {
      console.log("PaymentMethods already exist, no seeding needed.");
      return;
    }
    const paymentMethods = [
      { name: "cash" },
      { name: "credit card" },
      { name: "debit card" },
      { name: "bank transfer" },
      { name: "mobile payment" },
      { name: "user balance" },
    ];
    await PaymentMethod.insertMany(paymentMethods, { session });
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
    const count = await PaymentStatus.countDocuments().session(session);

    if (count !== 0) {
      console.log("PaymentStatuses already exist, no seeding needed.");
      return;
    }
    const paymentStatuses = [
      { name: "pending" },
      { name: "paid" },
      { name: "failed" },
      { name: "refunded" },
      { name: "cancelled" },
    ];
    await PaymentStatus.insertMany(paymentStatuses, { session });
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
    const count = await InstanceCondition.countDocuments().session(session);

    if (count !== 0) {
      console.log("InstanceConditions already exist, no seeding needed.");
      return;
    }
    const instanceConditions = [
      { name: "new" },
      { name: "used" },
      { name: "refurbished" },
      { name: "defective" },
    ];
    await InstanceCondition.insertMany(instanceConditions, { session });
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
    const count = await RefundStatus.countDocuments().session(session);

    if (count !== 0) {
      console.log("RefundStatuses already exist, no seeding needed.");
      return;
    }
    const refundStatuses = [
      { name: "pending" },
      { name: "refunded" },
      { name: "failed" },
      { name: "canceled" },
      { name: "rejected" },
    ];
    await RefundStatus.insertMany(refundStatuses, { session });
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
    const count = await ReturnStatus.countDocuments().session(session);

    if (count !== 0) {
      console.log("ReturnStatuses already exist, no seeding needed.");
      return;
    }
    const returnStatuses = [
      { name: "pending" },
      { name: "received" },
      { name: "approved" },
      { name: "declined" },
      { name: "refund pending" },
      { name: "refunded" },
      { name: "cancelled" },
    ];
    await ReturnStatus.insertMany(returnStatuses, { session });
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
    const count = await ReturnReason.countDocuments().session(session);

    if (count !== 0) {
      console.log("ReturnReasons already exist, no seeding needed.");
      return;
    }
    const returnReasons = [
      { name: "defective item" },
      { name: "wrong item" },
      { name: "item not as described" },
      { name: "item not fit" },
      { name: "quality issues" },
      { name: "other" },
    ];
    await ReturnReason.insertMany(returnReasons, { session });
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
    const count = await Permission.countDocuments().session(session);

    if (count !== 0) {
      console.log("Permissions already exist, no seeding needed.");
      return;
    }
    await Permission.insertMany(PERMISSION_LIST, { session });
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
    const roleCount = await Role.countDocuments().session(session);
    if (roleCount !== 0) {
      console.log("Roles already exist, no seeding needed.");
      return;
    }

    const permissionCount = await Permission.countDocuments().session(session);
    if (permissionCount === 0) {
      console.log("No permissions found, seeding permissions first...");
      await seedPermissions(session);
    }

    const systemUser = await User.findOne({ email: SYSTEM_USER.email }).session(
      session
    );
    if (!systemUser) {
      console.log("No system user found, creating system user first...");
      await createSystemUser(session);
    }
    const systemUserId = (await User.findOne({
      email: SYSTEM_USER.email,
    })
      .session(session)
      .select("_id"))!._id;

    const permissions = await Permission.find()
      .session(session)
      .select("_id code");

    const buyerPermissionCodes: string[] = BUYER_PERMISSION_LIST.map(
      (p) => p.code
    );
    const buyerPermissionIds = permissions
      .filter((p) => buyerPermissionCodes.includes(p.code))
      .map((p) => ({
        id: p._id,
        assignedBy: systemUserId,
      }));

    const roles = [
      {
        name: "admin",
        createdBy: systemUserId,
        userAssigned: 1, // Initial admin user will be assigned this role
        permissions: permissions.map((p) => ({
          id: p._id,
          assignedBy: systemUserId,
        })),
      },
      {
        name: "buyer",
        createdBy: systemUserId,
        permissions: buyerPermissionIds,
      },
    ];

    await Role.insertMany(roles, { session });
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
    const adminUser = await User.findOne({ email: ADMIN_USER.email }).session(
      session
    );
    if (adminUser) {
      console.log("Base admin user already exists, no need to create.");
      return;
    }

    const existSystemUser = await User.findOne({
      email: SYSTEM_USER.email,
    }).session(session);
    if (!existSystemUser) {
      console.log("No system user found, creating system user first...");
      await createSystemUser(session);
    }

    const roleCount = await Role.countDocuments().session(session);
    if (roleCount === 0) {
      console.log("No roles found, seeding roles first...");
      await seedRoles(session);
    }

    const adminRole = (await Role.findOne({ name: "admin" })
      .session(session)
      .select("_id"))!;

    const systemUser = (await User.findOne({ email: SYSTEM_USER.email })
      .session(session)
      .select("_id"))!;

    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, HASH_SALT);
    await User.create(
      [
        {
          fullName: ADMIN_USER.fullName,
          email: ADMIN_USER.email,
          password: hashedPassword,
          isEmailVerified: true,
          birth: new Date(),
          gender: ADMIN_USER.gender,
          roles: [{ id: adminRole._id, assignedBy: systemUser._id }],
        },
      ],
      { session }
    );
    console.log("🫘 ", "Base admin user created successfully");
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
