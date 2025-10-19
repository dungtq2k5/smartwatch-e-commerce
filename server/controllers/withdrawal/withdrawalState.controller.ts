import { Request, Response, NextFunction } from "express";
import WithdrawalState from "../../models/withdrawal/withdrawalState.model";
import { formatWithdrawalStateResponse } from "../../utils/utils";
import {
  SuccessResponse,
  WithdrawalStateListResponse,
} from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all withdrawal states...");

  try {
    const withdrawalStates = await WithdrawalState.find()
      .sort({ lookupId: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Withdrawal states fetched successfully.",
      data: {
        total: withdrawalStates.length,
        states: withdrawalStates.map(formatWithdrawalStateResponse),
      },
    } as SuccessResponse<WithdrawalStateListResponse>);
    console.log("✅ ", "Withdrawal states fetched successfully.");
  } catch (error) {
    next(error);
  }
}
