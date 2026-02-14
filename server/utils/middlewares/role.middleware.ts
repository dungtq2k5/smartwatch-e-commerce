import { Request, Response, NextFunction } from "express";
import {
  isValidNumString,
  removeOddSpaces,
} from "../../../common/utils.common";
import { HttpError } from "../errorHandler";
import { isPresent, isValidIdArray } from "../utils";
import { ROLE_SEARCH_SORT_OPTIONS } from "../../../common/configs.common";

function sanitizeRoleInput(
  req: Request,
  res: Response,
  next: NextFunction,
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

function sanitizeRoleSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing role search input...");
  // Since req.query can't be modified so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeDeleteBulkInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing delete many input...");
  const { roleIds } = req.body;

  // Auto remove duplicates
  if (roleIds && Array.isArray(roleIds)) {
    const uniqueRoleIds = Array.from(new Set(roleIds));
    req.body.roleIds = uniqueRoleIds;
  }

  next();
}

export function inputSanitizer(
  type: "create" | "update" | "search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "create":
    case "update":
      return sanitizeRoleInput;
    case "search":
      return sanitizeRoleSearchInput;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyRoleInput(
  type: "create" | "update" | "search" | "delete many",
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", `Verifying role input...`);

    const errors: string[] = [];
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
        case "search": {
          console.log("Validating role search input...");
          const { limit, offset, searchTerm, sortBy } =
            req["sanitizedQuery"] || req.query;

          if (limit !== undefined) {
            if (!isValidNumString(limit)) {
              errors.push("limit must be a valid number string.");
            } else if (Number(limit) <= 0) {
              errors.push("limit must be greater than 0.");
            }
          }
          if (offset !== undefined) {
            if (!isValidNumString(offset)) {
              errors.push("offset must be a valid number string.");
            } else if (Number(offset) < 0) {
              errors.push("offset must be greater than or equal to 0.");
            }
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("searchTerm must be a non-empty string.");
          }
          if (
            sortBy !== undefined &&
            !ROLE_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${ROLE_SEARCH_SORT_OPTIONS.join(", ")}.`,
            );
          }

          break;
        }
        case "delete many": {
          console.log("Validating delete many roles input...");
          const { roleIds } = req.body;

          if (!Array.isArray(roleIds) || roleIds.length === 0) {
            errors.push("roleIds must be a non-empty array.");
          } else {
            for (const [idx, id] of roleIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `roleIds[${idx}] is invalid. Each roleId must be a non-empty string.`,
                );
              }
            }
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
