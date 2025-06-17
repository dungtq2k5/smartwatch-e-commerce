export type ErrorResponse = {
  readonly success: false;
  message: string;
};

export type SuccessResponse = {
  readonly success: true;
  message?: string;
  data?: any;
};
