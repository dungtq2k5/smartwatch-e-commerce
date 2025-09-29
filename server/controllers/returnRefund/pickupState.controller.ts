import { Request, Response, NextFunction } from "express";
import { formatPickupStateResponse } from "../../utils/utils";
import {
  PickupStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import PickupState from "../../models/returnRefund/pickupState.model";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all pickup states...");

  try {
    const pickupStates = await PickupState.find().sort({ lookupId: 1 }).lean();

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
