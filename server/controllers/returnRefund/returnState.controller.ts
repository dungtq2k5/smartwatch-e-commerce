import { Request, Response, NextFunction } from "express";
import { formatReturnStateResponse } from "../../utils/utils";
import {
  ReturnStateListResponse,
  ReturnStateResponse,
  SuccessResponse,
} from "../../../common/types.common";
import ReturnState from "../../models/returnRefund/returnState.model";
import { HttpError } from "../../utils/errorHandler";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all return states...");

  try {
    const returnStates = await ReturnState.find().sort({ lookupId: 1 }).lean();

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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching return state...");
  const { stateId } = req.params;

  try {
    const returnState = await ReturnState.findById(stateId).lean();
    if (!returnState) {
      throw new HttpError(404, "Return state not found.");
    }

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