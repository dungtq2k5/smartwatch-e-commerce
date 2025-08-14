import { Request, Response, NextFunction } from "express";
import { removeOddSpaces } from "../../../common/utils.common";
import { HttpError } from "../errorHandler";
import { isPresent, isValidIdArray } from "../utils";

export function sanitizeRoleInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing role input...");
  const { name, permissionIds } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name).toLowerCase();
  }
  if (permissionIds !== undefined && Array.isArray(permissionIds)) {
    req.body.permissionIds = [...new Set(permissionIds)]; // For removing duplicates
  }

  next();
}

export function verifyRoleInput(type: "create" | "update") {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", `Verifying role input...`);

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("▶️ ", "Verifying role input for creation...");
          const { name, permissionIds } = req.body;

          if (!name) {
            errors.push("Role name is required.");
          } else if (typeof name !== "string") {
            errors.push("Role name must be a string.");
          }
          if (isPresent(permissionIds) && !isValidIdArray(permissionIds)) {
            errors.push("Permission IDs must be an array of valid IDs.");
          }
          break;
        }
        case "update": {
          console.log("▶️ ", "Verifying role input for update...");
          const { name, permissionIds } = req.body;

          if (name !== undefined && typeof name !== "string") {
            errors.push("Role name must be a string.");
          }
          if (isPresent(permissionIds) && !isValidIdArray(permissionIds)) {
            errors.push("Permission IDs must be an array of valid IDs.");
          }
          break;
        }
      }

      if (errors.length > 0) {
        throw new HttpError(400, errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
