import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
import { Types } from 'mongoose';

export function verifyEmptyBody(req: Request, res: Response, next: NextFunction): void {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(errorHandler(400, "No content was sent!"));
  }

  next();
}
