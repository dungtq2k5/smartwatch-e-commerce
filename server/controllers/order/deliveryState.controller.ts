import { Request, Response, NextFunction } from "express";
import DeliveryState, {
  IDeliveryState,
} from "../../models/order/deliveryState.model";
import {
  formatDeliveryStateResponse,
  getDeliveryStates,
} from "../../utils/utils";
import {
  DeliveryStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all delivery states...");

  try {
    const deliveryStates = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Delivery states fetched successfully.",
      data: {
        total: deliveryStates.length,
        states: deliveryStates.map(formatDeliveryStateResponse),
      },
    } as SuccessResponse<DeliveryStateListResponse>);
    console.log("✅ ", "Delivery states fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IDeliveryState>> {
  try {
    return getDeliveryStates();
  } catch (error) {
    console.error(
      "⚠️  Failed to get delivery states from cache, fallback to database, error:",
      error,
    );
    return await DeliveryState.find().lean();
  }
}
