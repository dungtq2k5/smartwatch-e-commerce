import type { ErrorThrowback } from "./types";

export function errorHandler(
  statusCode: number,
  message: string | string[]
): ErrorThrowback {
  return {
    statusCode,
    message,
  };
}
