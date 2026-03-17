import { Request, Response, NextFunction } from "express";
import WithdrawalState, {
  IWithdrawalState,
} from "../../models/withdrawal/withdrawalState.model";
import {
  formatWithdrawalStateResponse,
  getWithdrawalStates,
} from "../../utils/utils";
import {
  SuccessResponse,
  WithdrawalStateListResponse,
} from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all withdrawal states...");

  try {
    const withdrawalStates = await fetchAllWithFallback();

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

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IWithdrawalState>> {
  try {
    return getWithdrawalStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve withdrawal states from cache, get from db as fallback:",
      error,
    );
    return await WithdrawalState.find().lean();
  }
}
