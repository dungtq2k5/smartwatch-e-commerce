import { Request, Response, NextFunction } from "express";
import { formatRefundStateResponse, getRefundStates } from "../../utils/utils";
import {
  RefundStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import RefundState, {
  IRefundState,
} from "../../models/returnRefund/refundState.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all refund states...");

  try {
    const refundStates = await fetchAllWithFallback();

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

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IRefundState>> {
  try {
    return getRefundStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve refund states from cache, get from db as fallback:",
      error,
    );
    return await RefundState.find().lean();
  }
}
