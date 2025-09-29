import { Request, Response, NextFunction } from "express";
import {
  PaymentMethodListResponse,
  SuccessResponse,
} from "../../../common/types.common";
import { formatPaymentMethodResponse } from "../../utils/utils";
import PaymentMethod from "../../models/order/paymentMethod.model";

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all payment methods...");

  try {
    const paymentMethods = await PaymentMethod.find().sort({ lookupId: 1 }).lean();

    res.status(200).json({
      success: true,
      message: "Payment methods fetched successfully.",
      data: {
        total: paymentMethods.length,
        methods: paymentMethods.map(formatPaymentMethodResponse),
      },
    } as SuccessResponse<PaymentMethodListResponse>);
    console.log("✅ ", "Payment methods fetched successfully.");
  } catch (error) {
    next(error);
  }
}
