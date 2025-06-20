import { Request, Response, NextFunction } from "express";
import User from "../models/user/user.model";
import { errorHandler } from "../utils/errorHandler";
import bcrypt from "bcryptjs";
import { HASH_SALT, JWT_NAME } from "../configs/configs";
import {
  formatUserResponse,
  genJWTAndSetCookie,
  genVerificationCode,
} from "../utils/utils";
import Otp from "../models/user/otp.model";
import {
  RESET_TOKEN_TLL,
  VERIFICATION_CODE_TTL,
} from "../../common/configs.common";
import {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../utils/mailtrap";
import {
  sendPasswordResetSms,
  sendPasswordResetSuccessSms,
  sendVerificationSms,
} from "../utils/twilio";
import { SuccessResponse, UserResponse } from "../../common/types.common";
import mongoose from "mongoose";
import { genRandomPassword } from "../../common/utils.common";
import crypto from "crypto";
import PasswordResetToken from "../models/user/passwordResetToken.model";

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing signup request...");
  const { fullName, email, phoneNumber, password } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check existing user
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const existingUser = await User.findOne({
      isDeleted: false,
      $or: orConditions,
    });

    if (existingUser) {
      return next(
        errorHandler(
          409,
          "User already exists with this email or phone number, please login instead."
        )
      );
    }

    // 2. Save new user
    const hashedPassword = await bcrypt.hash(password, HASH_SALT);
    const verificationCode = genVerificationCode();
    const user = new User({
      fullName,
      email: email || null,
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
    });
    await user.save({ session });

    // 3. Save OTP for verification
    const otp = new Otp({
      userId: user._id,
      type: email ? "email" : "phone",
      code: verificationCode,
      expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL),
    });
    await otp.save({ session });

    // 4. Send verification code via email or SMS
    if (email) {
      await sendVerificationEmail(email, verificationCode);
    } else if (phoneNumber) {
      await sendVerificationSms(phoneNumber, verificationCode);
    }

    await session.commitTransaction();

    // 6. Set JWT and send cookie
    genJWTAndSetCookie(res, user._id.toString(), false);

    res.status(201).json({
      success: true,
      message:
        "User created successfully. Please check your email or phone number for the verification code.",
      data: {
        userId: user._id,
      },
    } as SuccessResponse);
    console.log("✅", "Signup process completed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing login request...");
  const { email, phoneNumber, password } = req.body;

  try {
    // 1. Check user exists
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const user = await User.findOne({
      isDeleted: false,
      $or: orConditions,
    });
    if (!user) {
      return next(errorHandler(404, "User not found, please sign up first."));
    }

    // 2. Check user is verified or not
    if (email && !user.isEmailVerified) {
      return next(
        errorHandler(403, "Email not verified. Please verify your email first.")
      );
    } else if (phoneNumber && !user.isPhoneNumberVerified) {
      return next(
        errorHandler(
          403,
          "Phone number not verified. Please verify your phone number first."
        )
      );
    }

    // 3. Check password or user is locked
    if (!bcrypt.compareSync(password, user.password) || user.isLocked) {
      return next(errorHandler(401, "Invalid credentials."));
    }

    // 4. Update last login time
    user.lastLogin = new Date();
    await user.save();

    // 5. Set JWT and send cookie
    genJWTAndSetCookie(res, user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "Login process completed successfully.");
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing logout request...");

  try {
    res
      .clearCookie(JWT_NAME)
      .status(200)
      .json({
        success: true,
        message: "Logout successful.",
      } as SuccessResponse);
    console.log("✅", "Logout process completed successfully.");
  } catch (error) {
    next(error);
  }
}

export async function verifyUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("▶️", "Processing user verification request...");
  const { userId, type, code } = req.body; // userId is auto assigned by middleware via JWT
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check user exists
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
    }

    // 3. Check valid OTP
    const otp = await Otp.findOne({
      userId,
      code,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otp) {
      return next(errorHandler(400, "Invalid or expired verification code."));
    }

    // 4. Update user verification status
    if (type === "email") {
      user.isEmailVerified = true;
    } else if (type === "phone") {
      user.isPhoneNumberVerified = true;
    }
    await user.save({ session });

    // 5. Invalidate ALL pending OTPs for this user and type for security
    await Otp.updateMany(
      { userId, type, isUsed: false },
      { $set: { isUsed: true } },
      { session }
    );

    // 6. Send welcome email if email is verified
    if (type === "email") {
      await sendWelcomeEmail(user.email, user.fullName);
    }

    await session.commitTransaction();

    // 7. Refresh JWT and set cookie with isVerified is true
    genJWTAndSetCookie(res, user._id.toString(), true);

    res.status(200).json({
      success: true,
      message: "User verified successfully.",
      data: {
        userId: user._id,
      },
    } as SuccessResponse);
    console.log("✅", "User verification process completed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function authByGoogle(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing Google authentication request...");
  const { fullName, email, avatarUrl } = req.body;

  try {
    // 1. Check user exists
    const user = await User.findOne({
      isDeleted: false,
      email,
    });

    // 2. User not exists -> create new user -> login
    if (!user) {
      const hashedPassword = await bcrypt.hash(genRandomPassword(), HASH_SALT);
      const newUser = new User({
        fullName,
        email,
        password: hashedPassword,
        avatarUrl: avatarUrl || null,
      });
      newUser.isEmailVerified = true; // Automatically verify email for Google users
      newUser.lastLogin = new Date();
      await newUser.save();

      genJWTAndSetCookie(res, newUser._id.toString());

      res.status(201).json({
        success: true,
        message: "User created and logged in successfully.",
        data: formatUserResponse(newUser),
      } as SuccessResponse<UserResponse>);
      console.log(
        "✅",
        "Google authentication process completed successfully."
      );
      return;
    }

    // 3. User exists -> login
    genJWTAndSetCookie(res, user._id.toString());
    user.fullName = fullName;
    if (avatarUrl) user.avatarUrl = avatarUrl; // Make sure user avatar is fresh case they updated their avatar with Google services
    user.isEmailVerified = true; // Make sure email is verified for Google users
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "Google login process completed successfully.");
  } catch (error) {
    next(error);
  }
}

// TODO handle when user signup with email then leaves and signup with phone (has 2 accounts), then they verified by phone and login but later update their email

// TODO when user is locked, send the announcement to user via email or sms

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing forgot password request...");
  const { email, phoneNumber } = req.body;

  try {
    // 1. Check user exists and verified
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const user = await User.findOne({
      isDeleted: false,
      $or: orConditions,
    });
    if (!user) {
      return next(errorHandler(404, "User not found."));
    }

    if (email && !user.isEmailVerified) {
      return next(errorHandler(403, "Email not verified."));
    } else if (phoneNumber && !user.isPhoneNumberVerified) {
      return next(errorHandler(403, "Phone number not verified."));
    }

    // 2. Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const tokenExpiry = new Date(Date.now() + RESET_TOKEN_TLL);
    const passwordResetToken = new PasswordResetToken({
      userId: user._id,
      token: resetToken,
      expiresAt: tokenExpiry,
    });

    await passwordResetToken.save();

    if (email) {
      await sendPasswordResetEmail(email, resetToken, next);
    } else if (phoneNumber) {
      await sendPasswordResetSms(phoneNumber, resetToken);
    }

    res.status(200).json({
      success: true,
      message:
        "Password reset link has been sent to your email or phone number.",
    } as SuccessResponse);
    console.log("✅", "Forgot password process completed successfully.");
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing reset password request...");
  const resetToken = req.params.token;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check reset token exists
    const passwordResetToken = await PasswordResetToken.findOne({
      token: resetToken,
      expiresAt: { $gt: new Date() },
      isUsed: false,
    });
    if (!passwordResetToken) {
      return next(
        errorHandler(400, "Invalid or expired password reset token.")
      );
    }

    // 2. Check user exists
    const user = await User.findById(passwordResetToken.userId);
    if (!user || user.isDeleted) {
      return next(errorHandler(400, "User not found."));
    }

    // 3. Update user password
    const hashedResetPassword = await bcrypt.hash(req.body.password, HASH_SALT);
    user.password = hashedResetPassword;
    await user.save({ session });

    // 4. Mark ALL reset tokens as used
    await PasswordResetToken.updateMany(
      { userId: user._id, isUsed: false },
      { $set: { isUsed: true } },
      { session }
    );

    // 5. Send email or SMS notification
    if (user.email) {
      await sendPasswordResetSuccessEmail(user.email);
    } else if (user.phoneNumber) {
      await sendPasswordResetSuccessSms(user.phoneNumber);
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    } as SuccessResponse);
    console.log("✅", "Reset password process completed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
