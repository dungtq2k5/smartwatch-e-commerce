import { Request, Response, NextFunction } from "express";
import {
  formatAdminWithdrawalRequestResponse,
  formatSelfWithdrawalRequestResponse,
  getLatestStateId,
  getSysUserId,
  getWithdrawalStateId,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import User from "../../models/user/user.model";
import { HttpError } from "../../utils/errorHandler";
import WithdrawalRequest from "../../models/withdrawal/withdrawalRequest.model";
import {
  DEFAULT_CURRENCY,
  LOOKUP_ID,
  MIN_WITHDRAWAL_AMOUNT_CENTS,
} from "../../../common/configs.common";
import type {
  SuccessResponse,
  SelfWithdrawalRequestListResponse,
  SelfWithdrawalRequestResponse,
  ApproveWithdrawalRequest,
  RejectWithdrawalRequest,
  SelfWithdrawalRequestSearchQuery,
  WithdrawalRequestCreate,
  AdminWithdrawalRequestResponse,
  WithdrawalRequestSearchQuery,
  AdminWithdrawalRequestListResponse,
} from "../../../common/types.common";
import UserBankAccount from "../../models/user/userBankAccount.model";
import stripe from "../../configs/stripe.config";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";

// --- BOTH BUYER AND ADMIN FUNCTIONS ---
export async function createRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating withdrawal request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }

  const { amountCents, bankAccountId } = req.body as WithdrawalRequestCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /*
      Business logic:
        1. Check user balance is enough.
        2. Check min cents can transfers.
        3. Check bank account want to transfer to is valid.
        4. Check existing pending request -> make one of a time to happening for many reasons (race condition, security).
    */

    const user = await User.findById(userId).session(session);
    if (!user) throw new HttpError(404, "User not found.");

    if (user.userBalanceCents < amountCents) {
      throw new HttpError(400, "Insufficient balance.");
    }
    if (amountCents < MIN_WITHDRAWAL_AMOUNT_CENTS) {
      throw new HttpError(
        400,
        `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT_CENTS} cents.`,
      );
    }

    // Get and validate bank account
    const bankAccount = await UserBankAccount.findOne({
      _id: bankAccountId,
      userId,
      isVerified: true,
      accountStatus: "enabled",
    }).session(session);
    if (!bankAccount) {
      throw new HttpError(
        400,
        "Invalid or unverified bank account. Please verify your bank account first.",
      );
    }

    // Check for existing pending withdrawal
    const existingPendingRequest = await WithdrawalRequest.findOne({
      userId,
      "states.id": getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PENDING),
    })
      .lean()
      .session(session);
    if (existingPendingRequest) {
      throw new HttpError(
        400,
        "You already have a pending withdrawal request. Please wait for it to be processed.",
      );
    }

    // Create request
    const withdrawalRequest = new WithdrawalRequest({
      userId,
      amountCents,
      currency: DEFAULT_CURRENCY,
      withdrawalMethod: "bank_transfer",
      bankAccount: {
        stripeConnectedAccountId: bankAccount.stripeConnectedAccountId,
        accountHolderName: bankAccount.accountHolderName,
        last4: bankAccount.last4,
        bankName: bankAccount.bankName,
      },
      states: [
        {
          id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PENDING),
          notes: `Withdrawal request created for bank account ending in ${bankAccount.last4}.`,
          createdBy: userId,
        },
      ],
    });

    await withdrawalRequest.save({ session });

    // Deduct user balance
    user.userBalanceCents -= amountCents;
    await user.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Withdrawal request created successfully.",
      data: formatSelfWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<SelfWithdrawalRequestResponse>);
    console.log("✅ ", "Withdrawal request created.");
  } catch (error) {
    next(error);
  }
}

export async function searchSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting user's withdrawal requests...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }

  const reqQuery = req.query as SelfWithdrawalRequestSearchQuery;
  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;

  try {
    const withdrawalRequests = await WithdrawalRequest.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await WithdrawalRequest.countDocuments({ userId });

    res.status(200).json({
      success: true,
      message: "User's withdrawal requests retrieved successfully.",
      data: {
        total,
        requests: {
          total: withdrawalRequests.length,
          requests: withdrawalRequests.map(formatSelfWithdrawalRequestResponse),
        },
        offset,
        limit,
      },
    } as SuccessResponse<SelfWithdrawalRequestListResponse>);
    console.log("✅ ", "User's withdrawal requests retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function getSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting user's withdrawal request by ID...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }
  const { requestId } = req.params;

  try {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new HttpError(404, "Request not found.");
    }
    const withdrawalRequest = await WithdrawalRequest.findOne({
      _id: requestId,
      userId,
    }).lean();
    if (!withdrawalRequest) {
      throw new HttpError(404, "Request not found.");
    }

    res.status(200).json({
      success: true,
      message: "User's withdrawal request retrieved successfully.",
      data: formatSelfWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<SelfWithdrawalRequestResponse>);
    console.log("✅ ", "User's withdrawal request retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function cancelRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Cancelling withdrawal request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }
  const { requestId } = req.params;
  const notes = (req.body as RejectWithdrawalRequest)?.notes;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new HttpError(404, "Request not found.");
    }
    const withdrawalRequest = await WithdrawalRequest.findOne({
      _id: requestId,
      userId,
    }).session(session);
    if (!withdrawalRequest) {
      throw new HttpError(404, "Request not found.");
    }

    /*
      Business logic:
        1. Can update to cancel when request is in pending state.
        2. Update request state to cancel.
        3. Refund to user balance.
    */

    const latestStateId = getLatestStateId(withdrawalRequest.states);
    if (
      !latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PENDING),
      )
    ) {
      throw new HttpError(400, "Only pending requests can be cancelled.");
    }

    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { userBalanceCents: withdrawalRequest.amountCents },
      },
      { session },
    );

    withdrawalRequest.states.push({
      id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.CANCELLED),
      notes: notes || "Withdrawal request cancelled by user",
      createdBy: new Types.ObjectId(userId),
    });

    await withdrawalRequest.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Withdrawal request cancelled successfully.",
      data: formatSelfWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<SelfWithdrawalRequestResponse>);
    console.log("✅ ", "Withdrawal request cancelled.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- ADMIN FUNCTIONS---
export async function approveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Approve withdrawal request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "Request user ID or role is missing, this should be handled by middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You don not have permission to perform this action."),
    );
  }

  const { requestId } = req.params;
  const notes = (req.body as ApproveWithdrawalRequest)?.notes;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(requestId)) {
      throw new HttpError(404, "Request not found.");
    }
    const withdrawalRequest =
      await WithdrawalRequest.findById(requestId).session(session);
    if (!withdrawalRequest) {
      throw new HttpError(404, "Request not found.");
    }

    /*
      Business logic: only can approve when in pending state.
        - approve -> withdraw by stripe.transfers.create -> listen to webhook to update db
    */

    const latestStateId = getLatestStateId(withdrawalRequest.states);
    if (
      latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.COMPLETED),
      )
    ) {
      throw new HttpError(400, "Completed requests cannot be updated.");
    }
    if (
      latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.APPROVED),
      )
    ) {
      throw new HttpError(400, "This request has already been approved.");
    }
    if (
      !latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PENDING),
      )
    ) {
      throw new HttpError(400, "This request is not valid for approve.");
    }

    const sysUserId = getSysUserId();
    withdrawalRequest.states.push(
      {
        id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.APPROVED),
        notes: notes || null,
        createdBy: new Types.ObjectId(reqUserId),
      },
      {
        id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PROCESSING),
        notes: "Processing withdrawal via Stripe",
        createdBy: sysUserId,
      },
    );

    let resMsg: string = "";
    try {
      // Create Stripe transfer to user's connected account
      await stripe.transfers.create({
        amount: withdrawalRequest.amountCents,
        currency: withdrawalRequest.currency,
        destination: withdrawalRequest.bankAccount.stripeConnectedAccountId,
        description: `Withdrawal for user ${withdrawalRequest.userId.toString()}`,
        metadata: {
          userId: withdrawalRequest.userId.toString(),
          withdrawalRequestId: withdrawalRequest._id.toString(),
        },
      });

      resMsg = "Withdrawal request approved and is being processed.";
    } catch (stripeError: any) {
      // If Stripe call fails, mark as failed immediately (no webhook will fire)
      console.error(
        "❌ ",
        "Stripe transfer creation failed:",
        stripeError,
        ".This request will be updated as failed.",
      );

      await User.findByIdAndUpdate(
        withdrawalRequest.userId,
        { $inc: { userBalanceCents: withdrawalRequest.amountCents } },
        { session },
      );

      withdrawalRequest.failureReason = stripeError.message;
      withdrawalRequest.states.push({
        id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.FAILED),
        notes: `Failed to submit to Stripe: ${stripeError.message}`,
        createdBy: sysUserId,
      });

      resMsg = "Withdrawal request failed during processing.";
    }

    await withdrawalRequest.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: resMsg,
      data: formatSelfWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<SelfWithdrawalRequestResponse>);
    console.log("✅ ", "Withdrawal request approved.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function rejectRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Reject withdrawal request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "Request user ID or role is missing, this should be handled by middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You don not have permission to perform this action."),
    );
  }

  const { requestId } = req.params;
  const notes = (req.body as RejectWithdrawalRequest)?.notes;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(requestId)) {
      throw new HttpError(404, "Request not found.");
    }
    const withdrawalRequest =
      await WithdrawalRequest.findById(requestId).session(session);
    if (!withdrawalRequest) {
      throw new HttpError(404, "Request not found.");
    }

    /*
      Business logic: can only be reject when in pending state
        - reject -> refund to user balance
    */

    const latestStateId = getLatestStateId(withdrawalRequest.states);
    if (
      latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.COMPLETED),
      )
    ) {
      throw new HttpError(400, "Completed requests cannot be updated.");
    }
    if (
      !latestStateId.equals(
        getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.PENDING),
      )
    ) {
      throw new HttpError(400, "This request is not valid for reject.");
    }

    await User.findByIdAndUpdate(
      withdrawalRequest.userId,
      {
        $inc: { userBalanceCents: withdrawalRequest.amountCents },
      },
      { session },
    );

    withdrawalRequest.states.push({
      id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.REJECTED),
      notes: notes || null,
      createdBy: new Types.ObjectId(reqUserId),
    });

    await withdrawalRequest.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Withdrawal request rejected.",
      data: formatSelfWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<SelfWithdrawalRequestResponse>);
    console.log("✅ ", "Withdrawal request rejected.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin searching withdrawal requests...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly is missing, this should be handled by middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You don not have permission to perform this action."),
    );
  }

  const reqQuery = req["sanitizedQuery"] as WithdrawalRequestSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  try {
    if (reqQuery.searchTerm) {
      const isValidObjId = Types.ObjectId.isValid(reqQuery.searchTerm);

      if (isValidObjId) {
        query.$or = [
          {
            _id: isValidObjId
              ? new Types.ObjectId(reqQuery.searchTerm)
              : undefined,
          },
          {
            userId: isValidObjId
              ? new Types.ObjectId(reqQuery.searchTerm)
              : undefined,
          },
        ];
      } else {
        // Search by user fullName and email
        const userIds = await User.find({
          $or: [
            { fullName: { $regex: reqQuery.searchTerm, $options: "i" } },
            { email: { $regex: reqQuery.searchTerm, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();

        query.userId = { $in: userIds.map((u) => u._id) };
      }
    }

    if (reqQuery.stateIds && reqQuery.stateIds.length > 0) {
      query["states.id"] = { $in: reqQuery.stateIds };
    }

    if (reqQuery.amountCentsMin) {
      query.amountCents = {
        $gte: Number.parseInt(reqQuery.amountCentsMin, 10),
      };
    }
    if (reqQuery.amountCentsMax) {
      query.amountCents = {
        ...query.amountCents,
        $lte: Number.parseInt(reqQuery.amountCentsMax, 10),
      };
    }

    if (reqQuery.currency) {
      query.currency = reqQuery.currency;
    }

    if (reqQuery.withdrawalMethod) {
      query.withdrawalMethod = reqQuery.withdrawalMethod;
    }

    if (reqQuery.createdAtFrom) {
      query.createdAt = {
        $gte: new Date(reqQuery.createdAtFrom),
      };
    }
    if (reqQuery.createdAtTo) {
      query.createdAt = {
        ...query.createdAt,
        $lte: new Date(reqQuery.createdAtTo),
      };
    }

    const sort = (reqQuery.sortBy || "createdAt").split("_");
    const sortField = sort[0];
    const sortBy = sort[1] === "desc" ? 1 : -1;
    const sortStage: any = { [sortField]: sortBy, _id: 1 };

    const withdrawalRequests = await WithdrawalRequest.aggregate([
      { $match: query },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "requestedBy",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$requestedBy" },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const total: number = withdrawalRequests[0].metadata[0]?.total || 0;
    const formattedRequests: AdminWithdrawalRequestResponse[] =
      withdrawalRequests[0].data.map(formatAdminWithdrawalRequestResponse);

    res.status(200).json({
      success: true,
      message: "Withdrawal requests retrieved successfully.",
      data: {
        total,
        requests: {
          total: formattedRequests.length,
          requests: formattedRequests,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminWithdrawalRequestListResponse>);
    console.log("✅ ", "Withdrawal requests retrieved.");
  } catch (error) {
    next(error);
  }
}

// Like normal getSelf function but has returnedBy field
export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin getting withdrawal request...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly is missing, this should be handled by middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You don not have permission to perform this action."),
    );
  }

  const { requestId } = req.params;

  try {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new HttpError(404, "Request not found.");
    }
    const withdrawalRequest = await WithdrawalRequest.findById(requestId).populate("userId", "_id fullName").lean();
    if (!withdrawalRequest) {
      throw new HttpError(404, "Request not found.");
    }

    res.status(200).json({
      success: true,
      message: "Withdrawal request retrieved successfully.",
      data: formatAdminWithdrawalRequestResponse(withdrawalRequest),
    } as SuccessResponse<AdminWithdrawalRequestResponse>);
    console.log("✅ ", "Withdrawal request retrieved.");
  } catch (error) {
    next(error);
  }
}
