import { Request, Response, NextFunction } from "express";
import { formatReturnReason, getReturnReasons } from "../../utils/utils";
import {
  ReturnReasonListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import ReturnReason, {
  IReturnReason,
} from "../../models/returnRefund/returnReason.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all return reasons...");

  try {
    const returnReasons = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Return reasons fetched successfully.",
      data: {
        total: returnReasons.length,
        reasons: returnReasons.map(formatReturnReason),
      },
    } as SuccessResponse<ReturnReasonListResponse>);
    console.log("✅ ", "Return reasons fetched successfully.");
  } catch (error) {
    next(error);
  }
}

async function fetchAllWithFallback(): Promise<States<IReturnReason>> {
  try {
    return getReturnReasons();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to fetch return reasons from cache, fetching from database as fallback:",
      error,
    );
    return await ReturnReason.find().lean();
  }
}
