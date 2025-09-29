import { Request, Response, NextFunction } from "express";
import { PaymentStateListResponse, SuccessResponse } from "../../../common/types.common";
import { formatPaymentStateResponse } from "../../utils/utils";
import PaymentState from "../../models/order/paymentState.model";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all payment states...");

  try {
    const paymentStates = await PaymentState.find().sort({ lookupId: 1 }).lean();

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