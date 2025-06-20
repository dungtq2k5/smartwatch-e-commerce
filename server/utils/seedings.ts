import GrnStatus from "../models/inventory/grnStatus.model";
import inventoryMovementType from "../models/inventory/inventoryMovementType.model";
import DeliveryState from "../models/order/deliveryState.model";
import PaymentMethod from "../models/order/paymentMethod.model";
import PaymentStatus from "../models/order/paymentStatus.model";
import InstanceCondition from "../models/product/instanceCondition.model"
import RefundStatus from "../models/returnRefund/refundStatus.model";
import ReturnStatus from "../models/returnRefund/returnStatus.model";
import ReturnReason from "../models/returnRefund/returnReason.model";

export async function seedGrnStatuses(): Promise<void> {
  try {
    const count = await GrnStatus.countDocuments();
    if (count === 0) {
      const grnStatuses = [
        { lookupId: 1, name: "completed" },
        { lookupId: 2, name: "reversal" },
        { lookupId: 3, name: "draft" },
      ];
      await GrnStatus.insertMany(grnStatuses);
      console.log("🫘 ", "GrnStatuses seeded successfully!");
    } else {
      console.log("GrnStatuses already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding GrnStatuses:", error);
    process.exit(1);
  }
}

export async function seedInventoryMovementTypes(): Promise<void> {
  try {
    const count = await inventoryMovementType.countDocuments();
    if (count === 0) {
      const movementTypes = [
        { lookupId: 1, name: "goods receipt", description: "Incoming stock from supplier." },
        { lookupId: 2, name: "grn cancellation", description: "Reversal of a good receipt notes." },
        { lookupId: 3, name: "sales out", description: "Outgoing stock due to a sale." },
        { lookupId: 4, name: "stock adjustment", description: "Manually increase/decrease in stock." },
        { lookupId: 5, name: "stock transfer", description: "Transfer of stock between locations." },
        { lookupId: 6, name: "damaged stock", description: "Stock that is damaged and needs to be written off." },
        { lookupId: 7, name: "return to supplier", description: "Returning stock to the supplier." },
        { lookupId: 8, name: "return from customer", description: "Stock returned from a customer." },
        { lookupId: 9, name: "stock audit", description: "Stock audit adjustments." },
        { lookupId: 10, name: "other", description: "Any other type of inventory movement." }
      ];
      await inventoryMovementType.insertMany(movementTypes);
      console.log("🫘 ", "InventoryMovementTypes seeded successfully!");
    } else {
      console.log("InventoryMovementTypes already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding InventoryMovementTypes:", error);
    process.exit(1);
  }
}

export async function seedDeliveryStates(): Promise<void> {
  try {
    const count = await DeliveryState.countDocuments();
    if (count === 0) {
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
    } else {
      console.log("DeliveryStates already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding DeliveryStates:", error);
    process.exit(1);
  }
}

export async function seedPaymentMethods(): Promise<void> {
  try {
    const count = await PaymentMethod.countDocuments();
    if (count === 0) {
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
    } else {
      console.log("PaymentMethods already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding PaymentMethods:", error);
    process.exit(1);
  }
}

export async function seedPaymentStatus(): Promise<void> {
  try {
    const count = await PaymentStatus.countDocuments();
    if (count === 0) {
      const paymentStatuses = [
        { lookupId: 1, name: "pending" },
        { lookupId: 2, name: "paid" },
        { lookupId: 3, name: "failed" },
        { lookupId: 4, name: "refunded" },
        { lookupId: 5, name: "cancelled" },
      ];
      await PaymentStatus.insertMany(paymentStatuses);
      console.log("🫘 ", "PaymentStatuses seeded successfully!");
    } else {
      console.log("PaymentStatuses already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding PaymentStatuses:", error);
    process.exit(1);
  }
}

export async function seedInstanceConditions(): Promise<void> {
  try {
    const count = await InstanceCondition.countDocuments();
    if (count === 0) {
      const instanceConditions = [
        { lookupId: 1, name: "new" },
        { lookupId: 2, name: "used" },
        { lookupId: 3, name: "refurbished" },
        { lookupId: 4, name: "defective" },
      ];
      await InstanceCondition.insertMany(instanceConditions);
      console.log("🫘 ", "InstanceConditions seeded successfully!");
    } else {
      console.log("InstanceConditions already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding InstanceConditions:", error);
    process.exit(1);
  }
}

export async function seedRefundStatus(): Promise<void> {
  try {
    const count = await RefundStatus.countDocuments();
    if (count === 0) {
      const refundStatuses = [
        { lookupId: 1, name: "pending" },
        { lookupId: 2, name: "refunded" },
        { lookupId: 3, name: "failed" },
        { lookupId: 4, name: "canceled" },
        { lookupId: 5, name: "rejected" },
      ];
      await RefundStatus.insertMany(refundStatuses);
      console.log("🫘 ", "RefundStatuses seeded successfully!");
    } else {
      console.log("RefundStatuses already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding RefundStatuses:", error);
    process.exit(1);
  }
}

export async function seedReturnStatuses(): Promise<void> {
  try {
    const count = await ReturnStatus.countDocuments();
    if (count === 0) {
      const returnStatuses = [
        { lookupId: 1, name: "pending" },
        { lookupId: 2, name: "received" },
        { lookupId: 3, name: "approved" },
        { lookupId: 4, name: "declined" },
        { lookupId: 5, name: "refund pending" },
        { lookupId: 6, name: "refunded" },
      ];
      await ReturnStatus.insertMany(returnStatuses);
      console.log("🫘 ", "ReturnStatuses seeded successfully!");
    } else {
      console.log("ReturnStatuses already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding ReturnStatuses:", error);
    process.exit(1);
  }
}

export async function seedReturnReasons(): Promise<void> {
  try {
    const count = await ReturnReason.countDocuments();
    if (count === 0) {
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
    } else {
      console.log("ReturnReasons already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding ReturnReasons:", error);
    process.exit(1);
  }
}

export async function seedAllCollections(): Promise<void> {
  await seedGrnStatuses();
  await seedInventoryMovementTypes();
  await seedDeliveryStates();
  await seedPaymentMethods();
  await seedPaymentStatus();
  await seedInstanceConditions();
  await seedRefundStatus();
  await seedReturnStatuses();
  await seedReturnReasons();
}