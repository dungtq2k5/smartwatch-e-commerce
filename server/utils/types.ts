export type ErrorThrowback = {
  statusCode: number;
  message: string | string[];
};

export type JwtPayload = {
  userId: string;
  isVerified: boolean;
};