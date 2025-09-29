import { Request, Response, NextFunction } from "express";
import OrderState from "../../models/order/orderState.model";
import { formatOrderStateResponse } from "../../utils/utils";
import { OrderStateListResponse, SuccessResponse } from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all order states...");

  try {
    const orderStates = await OrderState.find().sort({ lookupId: 1 }).lean();

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