import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errorHandler";
import { isEmptyObj } from "../../../common/utils.common";

export function verifyEmptyBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isEmptyObj(req.body)) {
    throw new HttpError(400, "No content was sent!");
  }

  next();
}




