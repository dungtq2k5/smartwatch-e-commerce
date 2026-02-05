import { Request, Response, NextFunction } from "express";
import InventoryMovementType from "../../models/inventory/inventoryMovementType.model";
import { formatInventoryMovementTypeResponse } from "../../utils/utils";
import {
  InventoryMovementTypeListResponse,
  SuccessResponse,
} from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Get all inventory movement types...");

  try {
    const states = await InventoryMovementType.find()
      .select("_id lookupId name description")
      .lean();

    res.status(200).json({
      success: true,
      message: "Inventory movement types fetched successfully.",
      data: {
        total: states.length,
        types: states.map(formatInventoryMovementTypeResponse),
      },
    } as SuccessResponse<InventoryMovementTypeListResponse>);
  } catch (error) {
    next(error);
  }
}
