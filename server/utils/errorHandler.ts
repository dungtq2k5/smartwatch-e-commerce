export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string | string[]) {
    super(Array.isArray(message) ? message.join(", ") : message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    Error.captureStackTrace(this);
  }
}
