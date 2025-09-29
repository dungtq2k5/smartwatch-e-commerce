import { Request, Response, NextFunction } from "express";
import { formatReturnReason } from "../../utils/utils";
import {
  ReturnReasonListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import ReturnReason from "../../models/returnRefund/returnReason.model";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all return reasons...");

  try {
    const returnReasons = await ReturnReason.find().lean();

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
