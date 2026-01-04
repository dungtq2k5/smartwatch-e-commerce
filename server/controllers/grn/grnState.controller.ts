import { Request, Response, NextFunction } from "express";
import GrnState from "../../models/inventory/grnState.model";
import { formatGrnStateResponse } from "../../utils/utils";
import {
  GrnStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Get all GRN states...");

  try {
    const states = await GrnState.find()
      .select("_id lookupId name description")
      .lean();

    res.status(200).json({
      success: true,
      message: "GRN states fetched successfully.",
      data: {
        total: states.length,
        states: states.map(formatGrnStateResponse),
      },
    } as SuccessResponse<GrnStateListResponse>);
  } catch (error) {
    next(error);
  }
}
