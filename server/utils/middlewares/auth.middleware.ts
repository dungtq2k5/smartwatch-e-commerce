import { Request, Response, NextFunction } from 'express';
import { getJWTPayload } from '../utils';
import { JWT_NAME } from '../../configs/configs';
import { errorHandler } from '../errorHandler';

export function verifyReauthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const payload = getJWTPayload(req.cookies[JWT_NAME]);
  if (payload) {
    if (payload.isVerified) {
      return next(errorHandler(409, "You are already authenticated."));
    } else {
      if (!req.body) req.body = {};
      req.body.userId = payload.userId; // Attach userId for further use
    }
  }

  next();
}

export function verifyAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const payload = getJWTPayload(req.cookies[JWT_NAME]);
  if (!payload || !payload.isVerified) return next(errorHandler(401, "You are not authenticated."));

  // Attach userId to request for further use
  if (!req.body) req.body = {};
  req.body.userId = payload.userId;

  next();
}
