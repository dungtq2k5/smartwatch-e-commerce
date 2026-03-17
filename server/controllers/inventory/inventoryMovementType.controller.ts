import { Request, Response, NextFunction } from "express";
import InventoryMovementType, {
  IInventoryMovementType,
} from "../../models/inventory/inventoryMovementType.model";
import {
  formatInventoryMovementTypeResponse,
  getInventoryMovementTypes,
} from "../../utils/utils";
import {
  InventoryMovementTypeListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Get all inventory movement types...");

  try {
    const states = await fetchAllWithFallback();

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

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IInventoryMovementType>> {
  try {
    return getInventoryMovementTypes();
  } catch (error) {
    console.warn(
      "Failed to fetch inventory movement types from cache, fallback to database:",
      error,
    );
    return await InventoryMovementType.find().lean();
  }
}
