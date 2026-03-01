import { Request, Response, NextFunction } from "express";
import type {
  OrderCancelReasonListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import CancelReason from "../../models/order/cancelReason.model";
import { formatOrderCancelReasonResponse } from "../../utils/utils";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all cancel reasons...");

  try {
    const reasons = await CancelReason.find().lean();

    res.status(200).json({
      success: true,
      message: "Cancel reasons fetched successfully.",
      data: {
        total: reasons.length,
        reasons: reasons.map(formatOrderCancelReasonResponse),
      },
    } as SuccessResponse<OrderCancelReasonListResponse>);
    console.log("✅ ", "Cancel reasons fetched successfully.");
  } catch (error) {
    next(error);
  }
}
