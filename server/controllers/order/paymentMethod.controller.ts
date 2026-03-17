import { Request, Response, NextFunction } from "express";
import {
  PaymentMethodListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatPaymentMethodResponse,
  getPaymentMethods,
} from "../../utils/utils";
import PaymentMethod, {
  IPaymentMethod,
} from "../../models/order/paymentMethod.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all payment methods...");

  try {
    const paymentMethods = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Payment methods fetched successfully.",
      data: {
        total: paymentMethods.length,
        methods: paymentMethods.map(formatPaymentMethodResponse),
      },
    } as SuccessResponse<PaymentMethodListResponse>);
    console.log("✅ ", "Payment methods fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IPaymentMethod>> {
  try {
    return getPaymentMethods();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve payment methods from cache, get from db as fallback:",
      error,
    );
    return await PaymentMethod.find().lean();
  }
}
