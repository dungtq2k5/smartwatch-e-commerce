import { Request, Response, NextFunction } from "express";
import { formatRefundStateResponse } from "../../utils/utils";
import {
  RefundStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import RefundState from "../../models/returnRefund/refundState.model";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all refund states...");

  try {
    const refundStates = await RefundState.find().sort({ lookupId: 1 }).lean();

    res.status(200).json({
      success: true,
      message: "Refund states fetched successfully.",
      data: {
        total: refundStates.length,
        states: refundStates.map(formatRefundStateResponse),
      },
    } as SuccessResponse<RefundStateListResponse>);
    console.log("✅ ", "Refund states fetched successfully.");
  } catch (error) {
    next(error);
  }
}
