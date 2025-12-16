import { Request, Response, NextFunction } from "express";
import InstanceCondition from "../../models/product/instanceCondition.model";
import { formatInstanceConditionResponse } from "../../utils/utils";
import {
  InstanceConditionListResponse,
  SuccessResponse,
} from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all instance conditions...");

  try {
    const conditions = await InstanceCondition.find()
      .sort({ lookupId: 1 })
      .lean();

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
