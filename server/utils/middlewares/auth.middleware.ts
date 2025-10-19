import { Request, Response, NextFunction } from "express";
import { getJwtPayload } from "../utils";
import { JWT_NAME } from "../../configs/configs";
import { HttpError } from "../errorHandler";
import { PermissionCode } from "../../../common/types.common";
import User, { IUser } from "../../models/user/user.model";
import { Types } from "mongoose";
import "../../models/role/permission.model"; // Need this import to populate function
import "../../models/role/role.model"; // Need this import to populate function

export function verifyReauthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const payload = getJwtPayload(req.cookies[JWT_NAME]);
  if (payload) {
    if (payload.isVerified) {
      throw new HttpError(409, "You are already authenticated.");
    }

    req["auth"] = { userId: payload.userId }; // Attach userId for further use
  }

  next();
}

export function verifyJwtHasUserId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const payload = getJwtPayload(req.cookies[JWT_NAME]);
  if (!payload || !payload.userId) {
    throw new HttpError(401, "You are not authenticated.");
  }

  req["auth"] = { userId: payload.userId }; // Attach userId for further use

  next();
}

export function verifyAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const payload = getJwtPayload(req.cookies[JWT_NAME]);
  if (!payload || !payload.isVerified) {
    throw new HttpError(401, "You are not authenticated.");
  }

  req["auth"] = { userId: payload.userId }; // Attach userId for further use

  next();
}

// Handle JWT
// Handle user not found
// Handle locked user
// Handle user has permission
// Assign userId and onlyBuyer to req.auth, user to req.user for further use
export function verifyPermission(permissionCode: PermissionCode) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Check JWT
      const payload = getJwtPayload(req.cookies[JWT_NAME]);
      if (!payload || !payload.isVerified) {
        throw new HttpError(401, "You are not authenticated.");
      }

      // Check user is valid
      const userId = payload.userId;
      if (!Types.ObjectId.isValid(userId)) {
        throw new HttpError(404, "Request user not found.");
      }

      // Fetch user with roles and permissions
      const user = await User.findById(userId).populate<{
        roles: {
          id: {
            name: string;
            permissions: {
              id: {
                code: string;
              };
            }[];
          };
        }[]; // Infer TS what the return of roles field of user will be
      }>({
        path: "roles.id", // Populate the 'id' field within each element of the 'roles' array
        select: "name permissions", // Populate the 'id' field within each element of the 'roles' array
        populate: {
          // Nested population
          path: "permissions.id", // From the populated Role, populate the 'id' field within its 'permissions' array
          select: "code", // From the populated Role, populate the 'id' field within its 'permissions' array
        },
      });

      if (!user || user.isDeleted) {
        throw new HttpError(404, "Request user not found.");
      }
      if (user.isLocked) {
        throw new HttpError(403, "Request account is locked.");
      }

      // Verify if user has the required permission
      const hasPermission = user.roles.some((role) =>
        role.id.permissions.some((p) => p.id.code === permissionCode)
      );
      if (!hasPermission) {
        throw new HttpError(
          403,
          "You do not have permission to perform this action."
        );
      }

      const roleNames = user.roles.map((role) => role.id.name);
      const isBuyerOnly = roleNames.length === 1 && roleNames[0] === "buyer";

      // Depopulate to make user object look like when use findById()
      user.depopulate("roles.id");

      // Attach user and auth info to the request for subsequent handlers
      req["user"] = user as any as IUser;
      req["auth"] = {
        userId,
        isBuyerOnly,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
