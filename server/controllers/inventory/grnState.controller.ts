import { Request, Response, NextFunction } from "express";
import GrnState, { IGrnState } from "../../models/inventory/grnState.model";
import { formatGrnStateResponse, getGrnStates } from "../../utils/utils";
import {
  GrnStateListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Get all GRN states...");

  try {
    const states = await fetchAllWithFallback();

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

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IGrnState>> {
  try {
    return getGrnStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve GRN states from cache, get from db as fallback:",
      error,
    );
    return await GrnState.find().lean();
  }
}
