import { Request, Response, NextFunction } from "express";
import {
  formatReturnStateResponse,
  getReturnState,
  getReturnStates,
} from "../../utils/utils";
import {
  ReturnStateListResponse,
  ReturnStateResponse,
  SuccessResponse,
} from "../../../common/types.common";
import ReturnState, {
  IReturnState,
} from "../../models/returnRefund/returnState.model";
import { HttpError } from "../../utils/errorHandler";
import { States } from "../../utils/types";
import { Types } from "mongoose";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all return states...");

  try {
    const returnStates = await fetchAllWithFallback();

    res.status(200).json({
      success: true,
      message: "Return states fetched successfully.",
      data: {
        total: returnStates.length,
        states: returnStates.map(formatReturnStateResponse),
      },
    } as SuccessResponse<ReturnStateListResponse>);
    console.log("✅ ", "Return states fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching return state...");
  const { stateId } = req.params;

  try {
    const returnState = await fetchWithFallback(stateId);

    res.status(200).json({
      success: true,
      message: "Return state fetched successfully.",
      data: formatReturnStateResponse(returnState),
    } as SuccessResponse<ReturnStateResponse>);
    console.log("✅ ", "Return state fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IReturnState>> {
  try {
    return getReturnStates();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Return states not found in cache, fetching from database as fallback:",
      error,
    );
    return await ReturnState.find().lean();
  }
}

async function fetchWithFallback(
  stateId: Types.ObjectId | string,
): Promise<IReturnState> {
  try {
    return getReturnState(stateId);
  } catch (error) {
    console.warn(
      "⚠️ ",
      `Return state with ID ${stateId} not found in cache, fetching from database as fallback:`,
      error,
    );
    const returnState = await ReturnState.findById(stateId).lean();
    if (!returnState) {
      throw new HttpError(404, "Return state not found.");
    }
    return returnState;
  }
}
