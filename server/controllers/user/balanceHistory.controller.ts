import { Request, Response, NextFunction } from "express";
import {
  getLatestStateId,
  getOrderStateLookupId,
  getReturnStateLookupId,
  getWithdrawalStateLookupId,
  isPresent,
} from "../../utils/utils";
import { HttpError } from "../../utils/errorHandler";
import {
  SuccessResponse,
  UserBalanceHistoryListResponse,
  UserBalanceHistoryResponse,
  UserBalanceHistorySearchQuery,
} from "../../../common/types.common";
import { LOOKUP_ID } from "../../../common/configs.common";
import OrderReturn from "../../models/returnRefund/orderReturn.model";
import Order from "../../models/order/order.model";
import WithdrawRequest from "../../models/withdrawal/withdrawalRequest.model";
import { DEFAULT_SEARCH_LIMIT } from "../../configs/configs";

export async function searchSelfBalanceHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing search user balance history request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }

  /*
  Query params:
    - limit, offset
    - category: money_in(refund), money_out(withdraw request, payment to)
    - createdAtFrom: ISO date string
    - createdAtTo: ISO date string
  */

  const reqQuery = req["sanitizedQuery"] as UserBalanceHistorySearchQuery;

  const limit = reqQuery.limit ? Number.parseInt(reqQuery.limit, 10) : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const category = reqQuery.category;
  const { createdAtFrom, createdAtTo } = reqQuery;

  try {
    /*
      Business logic:
        - Fetch withdraw requests
        - Fetch orderReturns that have refundSummary.toBalanceCents > 0
        - Fetch orders that have paymentSummary.appliedBalanceCents > 0
    */

    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (createdAtFrom) {
      dateFilter.$gte = new Date(createdAtFrom);
    }
    if (createdAtTo) {
      dateFilter.$lte = new Date(createdAtTo);
    }

    let combinedHistory: UserBalanceHistoryResponse[] = [];

    // Money In: Refunds from Order Returns
    if (!category || category === "money_in") {
      const returns = await OrderReturn.find({
        userId,
        "refundSummary.toBalanceCents": { $gt: 0 },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      })
        .select("_id refundSummary.toBalanceCents states createdAt")
        .lean();

      const returnHistories: UserBalanceHistoryResponse[] = returns.map((r) => {
        const returnStateLookupId = getReturnStateLookupId(
          getLatestStateId(r.states)
        );
        const state =
          returnStateLookupId === LOOKUP_ID.RETURN_STATE.REFUNDED // refunded
            ? "completed"
            : ([LOOKUP_ID.RETURN_STATE.CANCELLED, LOOKUP_ID.RETURN_STATE.DECLINED] as string[]).includes(returnStateLookupId) // cancelled, declined
            ? "failed"
            : "pending";

        return {
          type: "refund",
          referenceId: r._id.toString(),
          balanceCentsUsed: r.refundSummary.toBalanceCents,
          state,
          createdAt: r.createdAt.toISOString(),
        };
      });

      combinedHistory.push(...returnHistories);
    }

    // Money Out: Payments for Orders and Withdraw Requests
    if (!category || category === "money_out") {
      // Payments for Orders
      const orders = await Order.find({
        userId,
        "paymentSummary.appliedBalanceCents": { $gt: 0 },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      })
        .select("_id paymentSummary.appliedBalanceCents states createdAt")
        .lean();

      const orderHistories: UserBalanceHistoryResponse[] = orders.map((o) => {
        const orderStateLookupId = getOrderStateLookupId(
          getLatestStateId(o.states)
        );
        const state = ([LOOKUP_ID.ORDER_STATE.DELIVERED, LOOKUP_ID.ORDER_STATE.COMPLETED] as string[]).includes(orderStateLookupId) // delivered, completed
          ? "completed"
          : orderStateLookupId === LOOKUP_ID.ORDER_STATE.CANCELLED // cancelled
          ? "failed"
          : "pending";

        return {
          type: "payment_to",
          referenceId: o._id.toString(),
          balanceCentsUsed: o.paymentSummary.appliedBalanceCents,
          state,
          createdAt: o.createdAt.toISOString(),
        };
      });

      // Withdraw Requests
      const withdraws = await WithdrawRequest.find({
        userId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      })
        .select("_id amountCents states createdAt")
        .lean();

      const withdrawHistories: UserBalanceHistoryResponse[] = withdraws.map(
        (w) => {
          const withdrawStateLookupId = getWithdrawalStateLookupId(
            getLatestStateId(w.states)
          );
          const state = ([LOOKUP_ID.WITHDRAWAL_STATE.PENDING, LOOKUP_ID.WITHDRAWAL_STATE.APPROVED, LOOKUP_ID.WITHDRAWAL_STATE.PROCESSING] as string[]).includes(withdrawStateLookupId) // pending, approved, processing
            ? "pending"
            : withdrawStateLookupId === LOOKUP_ID.WITHDRAWAL_STATE.COMPLETED // completed
            ? "completed"
            : "failed"; // rejected, cancelled

          return {
            type: "withdraw_request",
            referenceId: w._id.toString(),
            balanceCentsUsed: w.amountCents,
            state,
            createdAt: w.createdAt.toISOString(),
          };
        }
      );

      combinedHistory.push(...orderHistories, ...withdrawHistories);
    }

    // Sort all combined results by createdAt desc
    combinedHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedHistories = combinedHistory.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      message: "User balance history retrieved successfully.",
      data: {
        total: combinedHistory.length,
        histories: {
          total: paginatedHistories.length,
          histories: paginatedHistories,
        },
        offset,
        limit,
      },
    } as SuccessResponse<UserBalanceHistoryListResponse>);
    console.log("✅ ", "User balance history retrieved successfully.");
  } catch (error) {
    next(error);
  }
}
