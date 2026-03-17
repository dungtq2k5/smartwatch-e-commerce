import { Request, Response, NextFunction } from "express";
import { formatPickupStateResponse, getPickupStates } from "../../utils/utils";
import {
  PickupStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import PickupState, {
  IPickupState,
} from "../../models/returnRefund/pickupState.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all pickup states...");

  try {
    const pickupStates = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Pickup states fetched successfully.",
      data: {
        total: pickupStates.length,
        states: pickupStates.map(formatPickupStateResponse),
      },
    } as SuccessResponse<PickupStateListResponse>);
    console.log("✅ ", "Pickup states fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IPickupState>> {
  try {
    return getPickupStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to fetch pickup states from cache, fetching from database as fallback:",
      error,
    );
    return await PickupState.find().lean();
  }
}
