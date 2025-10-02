import { Request, Response, NextFunction } from "express";
import DeliveryState from "../../models/order/deliveryState.model";
import { formatDeliveryStateResponse } from "../../utils/utils";
import {
  DeliveryStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all delivery states...");

  try {
    const deliveryStates = await DeliveryState.find()
      .sort({ lookupId: 1 })
      .lean();

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
