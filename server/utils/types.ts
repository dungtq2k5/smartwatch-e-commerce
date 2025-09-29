import { Types } from "mongoose";
import { IUser } from "../models/user/user.model";

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuth;
      user?: IUser;
      sanitizedQuery?: any;
    }
  }
}

export type ErrorThrowback = {
  statusCode: number;
  message: string | string[];
};

export type JwtPayload = {
  userId: string;
  isVerified: boolean;
};

export type RequestAuth = {
  userId: string;
  isVerified?: boolean;
  isBuyerOnly?: boolean;
};

export type LookupIdObjectId = {
  [lookupId: string]: Types.ObjectId;
};

export type ReturnItem = {
  variationId: Types.ObjectId;
  quantity: number;
  totalCents: number;
  instances: { id: Types.ObjectId; sku: string }[];
};
