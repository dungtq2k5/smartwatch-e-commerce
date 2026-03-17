import { Request, Response, NextFunction } from "express";
import InstanceCondition, {
  IInstanceCondition,
} from "../../models/product/instanceCondition.model";
import {
  formatInstanceConditionResponse,
  getInstanceConditions,
} from "../../utils/utils";
import {
  InstanceConditionListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all instance conditions...");

  try {
    const conditions = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Instance conditions fetched successfully.",
      data: {
        total: conditions.length,
        conditions: conditions.map(formatInstanceConditionResponse),
      },
    } as SuccessResponse<InstanceConditionListResponse>);
    console.log("✅ ", "Instance conditions fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IInstanceCondition>> {
  try {
    return getInstanceConditions();
  } catch (error) {
    console.warn(
      "⚠️  Failed to fetch instance conditions from cache, fallback to database:",
      error,
    );
    return await InstanceCondition.find().lean();
  }
}
