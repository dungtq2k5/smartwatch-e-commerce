import { Request, Response, NextFunction } from "express";
import {
  PaymentStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatPaymentStateResponse,
  getPaymentStates,
} from "../../utils/utils";
import PaymentState, {
  IPaymentState,
} from "../../models/order/paymentState.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all payment states...");

  try {
    const paymentStates = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Payment states fetched successfully.",
      data: {
        total: paymentStates.length,
        states: paymentStates.map(formatPaymentStateResponse),
      },
    } as SuccessResponse<PaymentStateListResponse>);
    console.log("✅ ", "Payment states fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IPaymentState>> {
  try {
    return getPaymentStates();
  } catch (error) {
    console.warn(
      "⚠️  Failed to fetch payment states from cache. Fallback to database. Error:",
      error,
    );
    return await PaymentState.find().lean();
  }
}
