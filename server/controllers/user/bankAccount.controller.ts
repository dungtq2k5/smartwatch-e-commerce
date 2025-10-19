import { Request, Response, NextFunction } from "express";
import {
  formatSetupBankAccountResponse,
  formatUserSelfBankAccountResponse,
  isPresent,
} from "../../utils/utils";
import { HttpError } from "../../utils/errorHandler";
import UserBankAccount from "../../models/user/userBankAccount.model";
import {
  SuccessResponse,
  UserBankAccountSetupResponse,
  UserSelfBankAccountListResponse,
  UserSelfBankAccountResponse,
} from "../../../common/types.common";
import stripe from "../../configs/stripe.config";
import {
  DEFAULT_BANK_ACCOUNT_COUNTRY,
  DEFAULT_CURRENCY,
} from "../../../common/configs.common";
import mongoose, { Types } from "mongoose";

export async function setupBankAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Setting up user bank account...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Only allow one pending account setup at a time per user
    const deletedPendingAccount = await UserBankAccount.findOneAndDelete({
      userId,
      accountStatus: "pending",
      requiresAction: true,
    })
      .lean()
      .session(session);
    if (deletedPendingAccount) {
      await stripe.accounts.del(deletedPendingAccount.stripeConnectedAccountId);
    }

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: DEFAULT_BANK_ACCOUNT_COUNTRY,
      metadata: { userId },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.CLIENT_URL}/account/bank-card?refresh=true`,
      return_url: `${process.env.CLIENT_URL}/account/bank-card?setup=complete`,
      type: "account_onboarding",
    });

    // Create bank account record in DB
    const bankAccount = new UserBankAccount({
      userId,
      stripeConnectedAccountId: account.id,
      accountHolderName: "Pending Setup",
      last4: "0000",
      bankName: "Pending Setup",
      accountType: "checking", // Default to checking, will update after onboarding
      currency: DEFAULT_CURRENCY,
      country: DEFAULT_BANK_ACCOUNT_COUNTRY,
      accountStatus: "pending",
      requiresAction: true,
    });

    await bankAccount.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank account setup initiated successfully",
      data: formatSetupBankAccountResponse({
        ...bankAccount.toObject(),
        onboardingUrl: accountLink.url,
      }),
    } as SuccessResponse<UserBankAccountSetupResponse>);
    console.log("✅ ", "Bank account setup initiated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function refreshOnboardingUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Refreshing onboarding URL...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { bankAccountId } = req.params;

  try {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new HttpError(404, "Bank account not found.");
    }
    const bankAccount = await UserBankAccount.findOne({
      _id: bankAccountId,
      userId,
    }).lean();
    if (!bankAccount) {
      throw new HttpError(404, "Bank account not found.");
    }
    if (bankAccount.accountStatus !== "pending") {
      throw new HttpError(400, "Bank account setup is already complete.");
    }

    // Create new account link
    const accountLink = await stripe.accountLinks.create({
      account: bankAccount.stripeConnectedAccountId,
      refresh_url: `${process.env.CLIENT_URL}/account/bank-card?refresh=true`,
      return_url: `${process.env.CLIENT_URL}/account/bank-card?setup=complete`,
      type: "account_onboarding",
    });

    res.status(200).json({
      success: true,
      message: "Onboarding URL refreshed successfully.",
      data: formatSetupBankAccountResponse({
        ...bankAccount, // no need to use toObject because of lean
        onboardingUrl: accountLink.url,
      }),
    } as SuccessResponse<UserBankAccountSetupResponse>);
    console.log("✅ ", "Onboarding URL refreshed successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting all user self bank accounts...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }

  try {
    const bankAccounts = await UserBankAccount.find({ userId })
      .select("-userId -stripeConnectedAccountId") // Hide sensitive data
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Bank accounts retrieved successfully",
      data: {
        total: bankAccounts.length,
        accounts: bankAccounts.map(formatUserSelfBankAccountResponse),
      },
    } as SuccessResponse<UserSelfBankAccountListResponse>);
    console.log("✅ ", "Bank accounts retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting user bank account...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { bankAccountId } = req.params;

  try {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new HttpError(404, "Bank account not found.");
    }
    const bankAccount = await UserBankAccount.findOne({
      _id: bankAccountId,
      userId,
    })
      .select("-userId -stripeConnectedAccountId")
      .lean(); // Hide sensitive data
    if (!bankAccount) {
      throw new HttpError(404, "Bank account not found.");
    }

    res.status(200).json({
      success: true,
      message: "Bank account retrieved successfully",
      data: formatUserSelfBankAccountResponse(bankAccount),
    } as SuccessResponse<UserSelfBankAccountResponse>);
    console.log("✅ ", "Bank account retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function setSelfAsDefault(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Setting user self bank account as default...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { bankAccountId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new HttpError(404, "Bank account not found.");
    }
    const bankAccount = await UserBankAccount.findOne({
      _id: bankAccountId,
      userId,
    }).session(session);
    if (!bankAccount) {
      throw new HttpError(404, "Bank account not found.");
    }

    if (!bankAccount.isVerified) {
      throw new HttpError(
        400,
        "Cannot set unverified bank account as default."
      );
    }
    if (bankAccount.accountStatus !== "enabled") {
      throw new HttpError(
        400,
        "Only enabled bank accounts can be set as default."
      );
    }
    if (bankAccount.isDefault) {
      throw new HttpError(400, "This bank account is already the default.");
    }

    // Remove default from other accounts
    await UserBankAccount.updateMany(
      { userId, isDefault: true },
      { isDefault: false }
    ).session(session);

    // Set this account as default
    bankAccount.isDefault = true;
    await bankAccount.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank account set as default successfully.",
      data: formatUserSelfBankAccountResponse(bankAccount),
    } as SuccessResponse<UserSelfBankAccountResponse>);
    console.log("✅ ", "Bank account set as default successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Removing user bank account...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { bankAccountId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new HttpError(404, "Bank account not found.");
    }
    const bankAccount = await UserBankAccount.findOne({
      _id: bankAccountId,
      userId,
    }).session(session);
    if (!bankAccount) {
      throw new HttpError(404, "Bank account not found.");
    }

    // Delete the bank account from DB
    await bankAccount.deleteOne({ session });

    // If the bank account is default, set another verified account as default
    if (bankAccount.isDefault) {
      const anotherAccount = await UserBankAccount.findOne({
        userId,
        _id: { $ne: bankAccountId },
        isVerified: true,
        accountStatus: "enabled",
      }).session(session);
      if (anotherAccount) {
        anotherAccount.isDefault = true;
        await anotherAccount.save({ session });
      }
    }

    // Delete the Stripe account
    await stripe.accounts.del(bankAccount.stripeConnectedAccountId);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank account removed successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Bank account removed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
