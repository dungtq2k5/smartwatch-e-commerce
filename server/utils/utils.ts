import { AVATAR_ALLOWED_TYPES } from "../../common/configs.common";
import { VERIFICATION_CODE_LENGTH } from "../../common/configs.common";
import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";
import { JWT_NAME, JWT_TTL } from "../configs/configs";
import { AdminUserResponse, UserResponse } from "../../common/types.common";
import { Types } from "mongoose";

export function isValidUrl(url: any): boolean {
  if (typeof url !== "string") return false;

  try {
    // Attempt to parse the url string as a URL.
    // This will throw an error if the string is not a valid URL format (e.g., empty, malformed).
    const parsedUrl = new URL(url);
    // Check if the protocol is HTTP or HTTPS, which are common for web-accessible images.
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (_) {
    // If new URL() throws an error, it means the url string is not a valid URL.
    return false;
  }
}

export async function isValidImgUrl(url: any): Promise<boolean> {
  if (!isValidUrl(url)) return false;

  try {
    const res = await fetch(url, { method: "HEAD" }); // use HEAD request to get headers only
    if (!res.ok) return false;

    const contentType = res.headers.get("content-type");
    if (contentType && AVATAR_ALLOWED_TYPES.includes(contentType)) return true;

    return false;
  } catch (error) {
    return false;
  }
}

export async function isValidImgUrls(imgUrls: any): Promise<boolean> {
  if (!Array.isArray(imgUrls)) return false;

  for (const url of imgUrls) {
    if (!(await isValidImgUrl(url))) return false;
  }

  return true;
}

export function genVerificationCode(
  length: number = VERIFICATION_CODE_LENGTH
): string {
  if (length <= 0) {
    throw new Error("Verification code length must be a positive integer.");
  }

  // Calculate the maximum value for a random number (e.g., 10^6 for length 6 gives range 0-999999).
  const max = Math.pow(10, length);

  // Generate a random integer from 0 to max - 1.
  const randomNumber = Math.floor(Math.random() * max);

  // Convert the number to a string and pad with leading zeros to ensure it has the correct length.
  return randomNumber.toString().padStart(length, "0");
}

export function genJWTAndSetCookie(
  res: any,
  userId: string,
  isVerified: boolean
): string {
  const token = jwt.sign(
    { userId, isVerified } as JwtPayload,
    process.env.JWT_SECRET_KEY!,
    { expiresIn: JWT_TTL }
  );

  res.cookie(JWT_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    sameSite: "Strict", // Prevent CSRF attacks
    maxAge: JWT_TTL,
  });

  return token;
}

export function getJWTPayload(token: any): JwtPayload | false {
  if (typeof token !== "string") return false;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;

    return payload;
  } catch (_) {
    return false;
  }
}

export function formatUserResponse(user: any): UserResponse {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ? user.avatarUrl : undefined,
    email: user.email ? user.email : undefined,
    isEmailVerified: user.isEmailVerified,
    phoneNumber: user.phoneNumber ? user.phoneNumber : undefined,
    isPhoneNumberVerified: user.isPhoneNumberVerified,
    stripeCustomerId: user.stripeCustomerId ? user.stripeCustomerId : undefined,
    userBalanceCents: user.userBalanceCents,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function formatAdminUserResponse(user: any): AdminUserResponse {
  return {
    ...formatUserResponse(user),
    isLocked: user.isLocked,
  }
}

export function isValidIdArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  return arr.every((id) => Types.ObjectId.isValid(id));
}