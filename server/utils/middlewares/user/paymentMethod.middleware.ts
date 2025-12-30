import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../errorHandler";

export function verifyPaymentMethodInput(
  type: "create"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating payment method input...");

    const errors: string[] = [];
    try {
      if (type === "create") {
        const { stripePaymentMethodId } = req.body;

        if (!stripePaymentMethodId) {
          errors.push("stripePaymentMethodId is required.");
        } else if (typeof stripePaymentMethodId !== "string") {
          errors.push("stripePaymentMethodId must be non-empty string.");
        }
      }

      if (errors.length > 0) {
        throw new HttpError(400, errors);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
