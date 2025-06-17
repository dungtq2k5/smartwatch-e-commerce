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
        { _id: 1, name: "completed" },
        { _id: 2, name: "reversal" },
        { _id: 3, name: "draft" },
      ];
      await GrnStatus.insertMany(grnStatuses);
      console.log("🫘", "GrnStatuses seeded successfully!");
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
        { _id: 1, name: "goods receipt", description: "Incoming stock from supplier." },
        { _id: 2, name: "grn cancellation", description: "Reversal of a good receipt notes." },
        { _id: 3, name: "sales out", description: "Outgoing stock due to a sale." },
        { _id: 4, name: "stock adjustment", description: "Manually increase/decrease in stock." },
        { _id: 5, name: "stock transfer", description: "Transfer of stock between locations." },
        { _id: 6, name: "damaged stock", description: "Stock that is damaged and needs to be written off." },
        { _id: 7, name: "return to supplier", description: "Returning stock to the supplier." },
        { _id: 8, name: "return from customer", description: "Stock returned from a customer." },
        { _id: 9, name: "stock audit", description: "Stock audit adjustments." },
        { _id: 10, name: "other", description: "Any other type of inventory movement." }
      ];
      await inventoryMovementType.insertMany(movementTypes);
      console.log("🫘", "InventoryMovementTypes seeded successfully!");
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
        { _id: 1, name: "order places" },
        { _id: 2, name: "order confirmed" },
        { _id: 3, name: "processing" },
        { _id: 4, name: "shipped" },
        { _id: 5, name: "out for delivery" },
        { _id: 6, name: "delivered" },
        { _id: 7, name: "received" },
        { _id: 8, name: "cancelled" },
        { _id: 9, name: "returned" },
      ];
      await DeliveryState.insertMany(deliveryStates);
      console.log("🫘", "DeliveryStates seeded successfully!");
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
        { _id: 1, name: "cash" },
        { _id: 2, name: "credit card" },
        { _id: 3, name: "debit card" },
        { _id: 4, name: "bank transfer" },
        { _id: 5, name: "mobile payment" },
        { _id: 6, name: "user balance" },
      ];
      await PaymentMethod.insertMany(paymentMethods);
      console.log("🫘", "PaymentMethods seeded successfully!");
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
        { _id: 1, name: "pending" },
        { _id: 2, name: "paid" },
        { _id: 3, name: "failed" },
        { _id: 4, name: "refunded" },
        { _id: 5, name: "cancelled" },
      ];
      await PaymentStatus.insertMany(paymentStatuses);
      console.log("🫘", "PaymentStatuses seeded successfully!");
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
        { _id: 1, name: "new" },
        { _id: 2, name: "used" },
        { _id: 3, name: "refurbished" },
        { _id: 4, name: "defective" },
      ];
      await InstanceCondition.insertMany(instanceConditions);
      console.log("🫘", "InstanceConditions seeded successfully!");
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
        { _id: 1, name: "pending" },
        { _id: 2, name: "refunded" },
        { _id: 3, name: "failed" },
        { _id: 4, name: "canceled" },
        { _id: 5, name: "rejected" },
      ];
      await RefundStatus.insertMany(refundStatuses);
      console.log("🫘", "RefundStatuses seeded successfully!");
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
        { _id: 1, name: "pending" },
        { _id: 2, name: "received" },
        { _id: 3, name: "approved" },
        { _id: 4, name: "declined" },
        { _id: 5, name: "refund pending" },
        { _id: 5, name: "refunded" },
      ];
      await ReturnStatus.insertMany(returnStatuses);
      console.log("🫘", "ReturnStatuses seeded successfully!");
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
        { _id: 1, name: "defective item" },
        { _id: 2, name: "wrong item" },
        { _id: 3, name: "item not as described" },
        { _id: 4, name: "item not fit" },
        { _id: 5, name: "quality issues" },
        { _id: 6, name: "other" },
      ];
      await ReturnReason.insertMany(returnReasons);
      console.log("🫘", "ReturnReasons seeded successfully!");
    } else {
      console.log("ReturnReasons already exist, no seeding needed.");
    }
  } catch (error) {
    console.error("❌", "Error seeding ReturnReasons:", error);
    process.exit(1);
  }
}

export async function seedAllCollection(): Promise<void> {
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