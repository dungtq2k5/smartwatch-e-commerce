import { Request, Response, NextFunction } from "express";
import OrderState, { IOrderState } from "../../models/order/orderState.model";
import { formatOrderStateResponse, getOrderStates } from "../../utils/utils";
import { OrderStateListResponse, SuccessResponse } from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all order states...");

  try {
    const orderStates = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Order states fetched successfully.",
      data: {
        total: orderStates.length,
        states: orderStates.map(formatOrderStateResponse),
      },
    } as SuccessResponse<OrderStateListResponse>);
    console.log("✅ ", "Order states fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IOrderState>> {
  try {
    return getOrderStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve order states from cache, get from db as fallback:",
      error,
    );
    return await OrderState.find().lean();
  }
}
