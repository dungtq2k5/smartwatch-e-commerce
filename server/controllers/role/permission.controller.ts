import { Request, Response, NextFunction } from "express";
import Permissions from "../../models/role/permission.model";
import {
  PermissionListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { formatPermissionResponse } from "../../utils/utils";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all permission...");

  try {
    const permissions = await Permissions.find().lean(); // No need to sort because the order will followed by PERMISSION_LIST

    res.status(200).json({
      success: true,
      message: "Permissions fetched successfully.",
      data: {
        total: permissions.length,
        permissions: permissions.map(formatPermissionResponse),
      },
    } as SuccessResponse<PermissionListResponse>);
    console.log("✅ ", "Permissions fetched successfully.");
  } catch (error) {
    next(error);
  }
}
