import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { genRandomPassword } from "../../common/utils.common";
import {
  HASH_SALT,
  SYSTEM_USER,
  PERMISSION_LIST,
  BUYER_PERMISSION_LIST,
  ADMIN_USER,
  SYS_BUYER_ROLE,
  SYS_ADMIN_ROLE,
} from "../configs/configs";
import User from "../models/user/user.model";
import GrnState from "../models/inventory/grnState.model";
import InventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
import PaymentMethod from "../models/order/paymentMethod.model";
import PaymentState from "../models/order/paymentState.model";
import InstanceCondition from "../models/product/instanceCondition.model";
import RefundState from "../models/returnRefund/refundState.model";
import ReturnState from "../models/returnRefund/returnState.model";
import ReturnReason from "../models/returnRefund/returnReason.model";
import Permission from "../models/role/permission.model";
import Role from "../models/role/role.model";
import OrderState from "../models/order/orderState.model";
import PickupState from "../models/returnRefund/pickupState.model";
import CancelReason from "../models/order/cancelReason.model";
import WithdrawalState from "../models/withdrawal/withdrawalState.model";

export async function createSystemUser(
  session: mongoose.mongo.ClientSession,
): Promise<Types.ObjectId> {
  // Return system user ID
  try {
    const systemUser = await User.findOne({ email: SYSTEM_USER.email }).session(
      session,
    );
    if (systemUser) {
      console.log("System user already exists, no need to create.");
      return systemUser._id;
    }

    const hashedPassword = await bcrypt.hash(genRandomPassword(), HASH_SALT);
    const newSystemUser = new User({
      fullName: SYSTEM_USER.fullName,
      email: SYSTEM_USER.email,
      password: hashedPassword,
      birth: new Date(),
      gender: SYSTEM_USER.gender,
      isEmailVerified: true,
    });
    await newSystemUser.save({ session });
    console.log("✅ ", "System user created successfully");
    return newSystemUser._id;
  } catch (error) {
    throw new Error(`Error creating system user: ${error}`);
  }
}

export async function seedGrnStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await GrnState.countDocuments().session(session);

    if (count !== 0) {
      console.log("GrnStates already exist, no seeding needed.");
      return;
    }

    let grnStates = [
      {
        lookupId: "1",
        name: "completed",
        description: "All items in the GRN have been received and processed.",
      },
      {
        lookupId: "2",
        name: "reversal",
        description: "The GRN has been reversed due to an error or issue.",
      },
      {
        lookupId: "3",
        name: "draft",
        description: "The GRN is in draft state and not yet finalized.",
      },
    ];
    grnStates = grnStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await GrnState.insertMany(grnStates, { session });
    console.log("✅ ", "GrnStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding GrnStates: ${error}`);
  }
}

export async function seedInventoryMovementTypes(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await InventoryMovementType.countDocuments().session(session);

    if (count !== 0) {
      console.log("InventoryMovementTypes already exist, no seeding needed.");
      return;
    }

    let movementTypes = [
      {
        lookupId: "1",
        name: "goods receipt",
        description: "Incoming stock from supplier.",
      },
      {
        lookupId: "2",
        name: "grn cancellation",
        description: "Reversal of a good receipt notes.",
      },
      {
        lookupId: "3",
        name: "sales out",
        description: "Outgoing stock due to a sale.",
      },
      {
        lookupId: "4",
        name: "stock adjustment",
        description: "Manually increase/decrease in stock.",
      },
      {
        lookupId: "5",
        name: "stock transfer",
        description: "Transfer of stock between locations.",
      },
      {
        lookupId: "6",
        name: "damaged stock",
        description: "Stock that is damaged and needs to be written off.",
      },
      {
        lookupId: "7",
        name: "return to supplier",
        description: "Returning stock to the supplier.",
      },
      {
        lookupId: "8",
        name: "return from customer",
        description: "Stock returned from a customer.",
      },
      {
        lookupId: "9",
        name: "stock audit",
        description: "Stock audit adjustments.",
      },
      {
        lookupId: "10",
        name: "other",
        description: "Any other type of inventory movement.",
      },
    ];
    movementTypes = movementTypes.map((type) => ({
      ...type,
      createdBy: systemUserId,
    }));

    await InventoryMovementType.insertMany(movementTypes, { session });
    console.log("✅ ", "InventoryMovementTypes seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding InventoryMovementTypes: ${error}`);
  }
}

export async function seedDeliveryStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await DeliveryState.countDocuments().session(session);

    if (count !== 0) {
      console.log("DeliveryStates already exist, no seeding needed.");
      return;
    }
    let deliveryStates = [
      {
        lookupId: "1",
        name: "pending",
        level: 1,
        description:
          "A new order that needs to verified, not yet processed for shipping.",
      },
      {
        lookupId: "2",
        name: "processing",
        level: 2,
        description: "Order is being prepared for shipment.",
      },
      {
        lookupId: "3",
        name: "shipped",
        level: 3,
        description:
          "Order has been shipped and is on its way to the delivery address.",
      },
      {
        lookupId: "4",
        name: "in transit",
        level: 4,
        description: "Order is currently in transit with the shipping carrier.",
      },
      {
        lookupId: "5",
        name: "out for delivery",
        level: 5,
        description: "Order is out for delivery to the specified address.",
      },
      {
        lookupId: "6",
        name: "delivered",
        level: 6, // Final state
        description:
          "Courier has confirmed that the order has been delivered to the recipient.",
      },
      {
        lookupId: "7",
        name: "delivery failed",
        level: 6,
        description:
          "Courier attempted delivery but was unsuccessful (e.g., address not found, recipient unavailable).",
      },
      {
        lookupId: "8",
        name: "delivery rescheduled",
        level: 1,
        description:
          "A new delivery has been scheduled after a failed attempt.",
      },
      {
        lookupId: "9",
        name: "cancelled",
        level: 6,
        description: "Order was cancelled because of so many failed attempts.",
      },
    ];
    deliveryStates = deliveryStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await DeliveryState.insertMany(deliveryStates, { session });
    console.log("✅ ", "DeliveryStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding DeliveryStates: ${error}`);
  }
}

export async function seedPaymentMethods(
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await PaymentMethod.countDocuments().session(session);

    if (count !== 0) {
      console.log("PaymentMethods already exist, no seeding needed.");
      return;
    }
    const paymentMethods = [
      { lookupId: "1", name: "cash", description: "Cash on Delivery (COD)" },
      {
        lookupId: "2",
        name: "stripe",
        description: "Online payment via Stripe",
      },
    ];
    await PaymentMethod.insertMany(paymentMethods, { session });
    console.log("✅ ", "PaymentMethods seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding PaymentMethods: ${error}`);
  }
}

export async function seedPaymentStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await PaymentState.countDocuments().session(session);

    if (count !== 0) {
      console.log("PaymentStates already exist, no seeding needed.");
      return;
    }

    let paymentStates = [
      {
        lookupId: "1",
        name: "pending",
        description: "Payment is pending and has not been processed yet.",
      },
      {
        lookupId: "2",
        name: "paid",
        description: "Payment has been paid successfully.",
      },
      {
        lookupId: "3",
        name: "failed",
        description: "Payment attempt failed.",
      },
      {
        lookupId: "4",
        name: "refunded via Stripe",
        description: "Payment has been refunded to the buyer via Stripe.",
      },
      {
        lookupId: "5",
        name: "refunded to balance",
        description:
          "Payment has been refunded to the user balance since user hasn't had stripe customer ID or user had paid all by balance when checkout or refunded via Stripe was failed.",
      },
    ];
    paymentStates = paymentStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await PaymentState.insertMany(paymentStates, { session });
    console.log("✅ ", "PaymentStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding PaymentStates: ${error}`);
  }
}

export async function seedOrderStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await OrderState.countDocuments().session(session);

    if (count !== 0) {
      console.log("OrderStates already exist, no seeding needed.");
      return;
    }

    let orderStates = [
      {
        lookupId: "1",
        name: "pending",
        level: 1,
        description: "A new order that needs to verified.",
      },
      {
        lookupId: "2",
        name: "confirmed",
        level: 2,
        description: "Order is verified, ready for fulfillment.",
      },
      {
        lookupId: "3",
        name: "placed",
        level: 3,
        description: "Order has been placed and is being processed.",
      },
      {
        lookupId: "4",
        name: "delivering",
        level: 4,
        description: "Order is out for delivery to the specified address.",
      },
      {
        lookupId: "5",
        name: "delivered",
        level: 5,
        description: "Order has been delivered to the recipient.",
      },
      {
        lookupId: "6",
        name: "completed",
        level: 6, // Final state
        description: "Order has been received and confirmed by the buyer.",
      },
      {
        lookupId: "7",
        name: "cancelled",
        level: 6,
        description:
          "Order has been cancelled either by the buyer or the seller.",
      },
    ];
    orderStates = orderStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await OrderState.insertMany(orderStates, { session });
    console.log("✅ ", "OrderStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding OrderStates: ${error}`);
  }
}

export async function seedOrderCancelReasons(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await CancelReason.countDocuments().session(session);

    if (count !== 0) {
      console.log("CancelReasons already exist, no seeding needed.");
      return;
    }

    let cancelReasons = [
      { name: "ordered by mistake", description: "Ordered by mistake" },
      { name: "found a better price", description: "Found a better price" },
      { name: "product arrived too late", description: "Late delivery" },
      { name: "no longer needed/wanted", description: "No longer needed" },
      { name: "quality issues", description: "Quality issues" },
      { name: "other", description: "Other reason" },
    ];
    cancelReasons = cancelReasons.map((reason) => ({
      ...reason,
      createdBy: systemUserId,
    }));

    await CancelReason.insertMany(cancelReasons, { session });
    console.log("✅ ", "CancelReasons seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding CancelReasons: ${error}`);
  }
}

export async function seedInstanceConditions(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await InstanceCondition.countDocuments().session(session);

    if (count !== 0) {
      console.log("InstanceConditions already exist, no seeding needed.");
      return;
    }

    let instanceConditions = [
      {
        lookupId: "1",
        name: "new",
        description: "Brand new, unused, unopened, undamaged item",
      },
      {
        lookupId: "2",
        name: "used",
        description: "Item has been used previously",
      },
      {
        lookupId: "3",
        name: "refurbished",
        description: "Item has been restored to like-new condition",
      },
      {
        lookupId: "4",
        name: "defective",
        description: "Item is not in working condition",
      },
    ];
    instanceConditions = instanceConditions.map((condition) => ({
      ...condition,
      createdBy: systemUserId,
    }));

    await InstanceCondition.insertMany(instanceConditions, { session });
    console.log("✅ ", "InstanceConditions seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding InstanceConditions: ${error}`);
  }
}

export async function seedRefundStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await RefundState.countDocuments().session(session);

    if (count !== 0) {
      console.log("RefundStates already exist, no seeding needed.");
      return;
    }

    let refundStates = [
      {
        lookupId: "1",
        name: "pending",
        description: "Refund request has been initiated and is pending review.",
      },
      {
        lookupId: "2",
        name: "refunded via Stripe",
        description: "Refund has been processed via Stripe.",
      },
      {
        lookupId: "3",
        name: "refunded to balance",
        description:
          "Refund has been processed to user balance since user hasn't had stripe customer ID or user had paid all by balance when checkout or refunded via Stripe was failed.",
      },
      {
        lookupId: "4",
        name: "refund via Stripe failed",
        description:
          "The refund attempt via Stripe failed. A fallback to user balance was attempted.",
      },
    ];
    refundStates = refundStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await RefundState.insertMany(refundStates, { session });
    console.log("✅ ", "RefundStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding RefundStates: ${error}`);
  }
}

export async function seedReturnStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await ReturnState.countDocuments().session(session);

    if (count !== 0) {
      console.log("ReturnStates already exist, no seeding needed.");
      return;
    }

    let returnStates = [
      {
        lookupId: "1",
        name: "pending approval",
        level: 1,
        description:
          "Return request has been initiated and is pending admin review.",
      },
      {
        lookupId: "2",
        name: "approved",
        level: 2,
        description: "Return request has been approved by admin.",
      },
      {
        lookupId: "3",
        name: "items returning",
        level: 3,
        description:
          "Approved items are in the process of being returned by the shipper.",
      },
      {
        lookupId: "4",
        name: "items returned",
        level: 4,
        description:
          "Returned items have been received at the warehouse and are pending inspection.",
      },
      {
        lookupId: "5",
        name: "refunding",
        level: 5,
        description: "Return is being processed for refund.",
      },
      {
        lookupId: "6",
        name: "refunded",
        level: 6, // Final state
        description: "Return process is complete and refund has been issued.",
      },
      {
        lookupId: "7",
        name: "cancelled",
        level: 6,
        description: "Return request was cancelled by the user.",
      },
      {
        lookupId: "8",
        name: "declined",
        level: 6,
        description: "Return request has been declined by admin.",
      },
    ];
    returnStates = returnStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await ReturnState.insertMany(returnStates, { session });
    console.log("✅ ", "ReturnStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding ReturnStates: ${error}`);
  }
}

export async function seedReturnReasons(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await ReturnReason.countDocuments().session(session);

    if (count !== 0) {
      console.log("ReturnReasons already exist, no seeding needed.");
      return;
    }

    let returnReasons = [
      { name: "no reason", description: "No specific reason provided" },
      { name: "ordered by mistake", description: "Ordered by mistake" },
      { name: "better price available", description: "Found a better price" },
      { name: "product arrived too late", description: "Late delivery" },
      { name: "missing parts or accessories", description: "Missing parts" },
      { name: "wrong item sent", description: "Received wrong item" },
      { name: "item damaged or defective", description: "Damaged item" },
      { name: "product not as described", description: "Not as described" },
      { name: "no longer needed/wanted", description: "No longer needed" },
      { name: "incompatible or doesn't fit", description: "Doesn't fit" },
      { name: "quality issues", description: "Quality issues" },
      { name: "other", description: "Other reason" },
    ];
    returnReasons = returnReasons.map((reason) => ({
      ...reason,
      createdBy: systemUserId,
    }));

    await ReturnReason.insertMany(returnReasons, { session });
    console.log("✅ ", "ReturnReasons seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding ReturnReasons: ${error}`);
  }
}

export async function seedPickupStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await PickupState.countDocuments().session(session);
    if (count !== 0) {
      console.log("PickupStates already exist, no seeding needed.");
      return;
    }

    let pickupStates = [
      {
        lookupId: "1",
        name: "pending",
        level: 1,
        description: "Pickup request has been initiated and is pending review.",
      },
      {
        lookupId: "2",
        name: "out for pickup",
        level: 2,
        description: "Courier is out for pickup.",
      },
      {
        lookupId: "3",
        name: "picked up",
        level: 3,
        description: "Item(s) has been picked up by the courier.",
      },
      {
        lookupId: "4",
        name: "in transit to warehouse",
        level: 4,
        description: "Item(s) is in transit to the warehouse.",
      },
      {
        lookupId: "5",
        name: "returned to warehouse",
        level: 5, // Final state
        description: "Item(s) has been returned to the warehouse.",
      },
      {
        lookupId: "6",
        name: "pickup failed",
        level: 3, // Same level as "picked up" to indicate an attempt was made
        description: "Courier attempted pickup but was unsuccessful.",
      },
      {
        lookupId: "7",
        name: "pickup rescheduled",
        level: 1, // Back to a pending level
        description: "A new pickup has been scheduled after a failed attempt.",
      },
    ];
    pickupStates = pickupStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await PickupState.insertMany(pickupStates, { session });
    console.log("✅ ", "PickupStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding PickupStates: ${error}`);
  }
}

export async function seedPermissions(
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await Permission.countDocuments().session(session);

    if (count !== 0) {
      console.log("Permissions already exist, no seeding needed.");
      return;
    }
    await Permission.insertMany(PERMISSION_LIST, { session });
    console.log("✅ ", "Permissions seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding Permissions: ${error}`);
  }
}

export async function seedBaseRoles(
  session: mongoose.mongo.ClientSession,
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
      session,
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
      (p) => p.code,
    );
    const buyerPermissionIds = permissions
      .filter((p) => buyerPermissionCodes.includes(p.code))
      .map((p) => ({
        id: p._id,
        assignedBy: systemUserId,
      }));

    const roles = [
      {
        name: SYS_ADMIN_ROLE.name,
        createdBy: systemUserId,
        userAssigned: 1, // Initial admin user will be assigned this role
        permissions: permissions.map((p) => ({
          id: p._id,
          assignedBy: systemUserId,
        })),
      },
      {
        name: SYS_BUYER_ROLE.name,
        createdBy: systemUserId,
        permissions: buyerPermissionIds,
      },
    ];

    await Role.insertMany(roles, { session });
    console.log("✅ ", "Roles seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding Roles: ${error}`);
  }
}

export async function seedBaseAdminUser(
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const adminUser = await User.findOne({ email: ADMIN_USER.email }).session(
      session,
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
      await seedBaseRoles(session);
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
      { session },
    );
    console.log("✅ ", "Base admin user created successfully");
  } catch (error) {
    throw new Error(`Error creating base admin user: ${error}`);
  }
}

export async function seedWithdrawalStates(
  systemUserId: Types.ObjectId | string,
  session: mongoose.mongo.ClientSession,
): Promise<void> {
  try {
    const count = await WithdrawalState.countDocuments().session(session);

    if (count !== 0) {
      console.log("WithdrawalStates already exist, no seeding needed.");
      return;
    }

    let withdrawalStates = [
      {
        lookupId: "1",
        name: "pending",
        level: 1,
        description: "A new withdrawal request that needs to be reviewed.",
      },
      {
        lookupId: "2",
        name: "approved",
        level: 2,
        description: "Withdrawal request has been approved by admin.",
      },
      {
        lookupId: "3",
        name: "processing",
        level: 3,
        description: "Withdrawal request is being processed.",
      },
      {
        lookupId: "4",
        name: "completed",
        level: 4, // Final state
        description: "Withdrawal request has been completed successfully.",
      },
      {
        lookupId: "5",
        name: "failed",
        level: 4,
        description: "Withdrawal request has failed during processing.",
      },
      {
        lookupId: "6",
        name: "cancelled",
        level: 4,
        description: "Withdrawal request has been cancelled by the user.",
      },
      {
        lookupId: "7",
        name: "rejected",
        level: 4,
        description: "Withdrawal request has been rejected during review.",
      },
    ];
    withdrawalStates = withdrawalStates.map((state) => ({
      ...state,
      createdBy: systemUserId,
    }));

    await WithdrawalState.insertMany(withdrawalStates, { session });
    console.log("✅ ", "WithdrawalStates seeded successfully!");
  } catch (error) {
    throw new Error(`Error seeding WithdrawalStates: ${error}`);
  }
}

export async function seedAllCollections(): Promise<void> {
  console.log("🫘 ", "Seeding collections...");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Order is matter

    const sysUserId = await createSystemUser(session);

    await seedGrnStates(sysUserId, session);
    await seedInventoryMovementTypes(sysUserId, session);

    await seedDeliveryStates(sysUserId, session);
    await seedPaymentMethods(session);
    await seedPaymentStates(sysUserId, session);
    await seedOrderStates(sysUserId, session);
    await seedOrderCancelReasons(sysUserId, session);

    await seedInstanceConditions(sysUserId, session);

    await seedRefundStates(sysUserId, session);
    await seedReturnStates(sysUserId, session);
    await seedPickupStates(sysUserId, session);
    await seedReturnReasons(sysUserId, session);

    await seedPermissions(session);
    await seedBaseRoles(session);
    await seedBaseAdminUser(session);

    await seedWithdrawalStates(sysUserId, session);

    await session.commitTransaction();
    console.log("✅ ", "All collections seeded successfully!");
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ ", "Error seeding collections:", error);
    process.exit(1);
  } finally {
    await session.endSession();
  }
}
