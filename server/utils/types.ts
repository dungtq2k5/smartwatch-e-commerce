import { Types } from "mongoose";

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

export type KeyObjectId = {
  [key: string]: Types.ObjectId;
};