import { Request, Response, NextFunction } from "express";
import {
  PermissionListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { formatPermissionResponse, getPermissions } from "../../utils/utils";
import Permission, { IPermission } from "../../models/role/permission.model";
import { States } from "../../utils/types";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all permission...");

  try {
    const permissions = await fetchAllWithFallback();

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

// --- HELPER FUNCTIONS ---
async function fetchAllWithFallback(): Promise<States<IPermission>> {
  try {
    return getPermissions();
  } catch (error) {
    console.warn(
      "⚠️ ",
      "Failed to retrieve permissions from cache, get from db as fallback:",
      error,
    );
    return await Permission.find().lean();
  }
}
