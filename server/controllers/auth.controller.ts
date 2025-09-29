import { Request, Response, NextFunction } from "express";
import User from "../models/user/user.model";
import { HttpError } from "../utils/errorHandler";
import bcrypt from "bcryptjs";
import { HASH_SALT, JWT_NAME } from "../configs/configs";
import {
  formatUserResponse,
  genJWTAndSetCookie,
  genVerificationCode,
  getBuyerRoleId,
  getSysUserId,
} from "../utils/utils";
import Otp from "../models/user/otp.model";
import {
  RESET_TOKEN_TLL,
  USER_DEFAULT_BIRTH_GAP,
  USER_GENDER_OPTIONS,
  VERIFICATION_CODE_TTL,
} from "../../common/configs.common";
import {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../utils/email";
import {
  sendPasswordResetSms,
  sendPasswordResetSuccessSms,
  sendVerificationSms,
} from "../utils/twilio";
import {
  CheckAuthResponse,
  SuccessResponse,
  UserAuthByGoogle,
  UserForgotPassword,
  UserLogin,
  UserResponse,
  UserSignup,
  UserValidatePassword,
  UserVerify,
} from "../../common/types.common";
import mongoose, { Types } from "mongoose";
import { genRandomPassword } from "../../common/utils.common";
import crypto from "crypto";
import PasswordResetToken from "../models/user/passwordResetToken.model";
import admin from "firebase-admin";
import Role from "../models/role/role.model";
import { RequestAuth } from "../utils/types";
import stripe from "../configs/stripe.config";

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing signup request...");
  const { fullName, email, birth, gender, phoneNumber, password } =
    req.body as UserSignup;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check existing user
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const existingUser = await User.exists({
      isDeleted: false,
      $or: orConditions,
    })
      .lean()
      .session(session);

    if (existingUser) {
      throw new HttpError(
        409,
        "User already exists with this email or phone number, please login instead."
      );
    }

    // Business logic
    if (new Date(birth) > new Date()) {
      throw new HttpError(400, "Birth date cannot be in the future.");
    }

    // Assign default buyer role
    const roleAssignment = await assignDefaultBuyerRole(session);
    const hashedPassword = await bcrypt.hash(password, HASH_SALT);
    const verificationCode = genVerificationCode();
    const user = new User({
      fullName,
      email,
      phoneNumber,
      password: hashedPassword,
      birth,
      gender,
      roles: [
        {
          id: roleAssignment.roleId,
          assignedBy: roleAssignment.assignedBy,
        },
      ],
    });

    await user.save({ session });

    // Save OTP for verification
    await Otp.create(
      [
        {
          userId: user._id,
          type: email ? "email" : "phoneNumber",
          code: verificationCode,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL),
        },
      ],
      { session }
    );

    // Send verification code via email or SMS
    if (email) {
      await sendVerificationEmail(email, verificationCode);
    } else if (phoneNumber) {
      await sendVerificationSms(phoneNumber, verificationCode);
    }

    await session.commitTransaction();

    // Set JWT and send cookie
    genJWTAndSetCookie(res, user._id.toString(), false);

    res.status(201).json({
      success: true,
      message:
        "User created successfully. Please check your email or phone number for the verification code.",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
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
  const { email, phoneNumber, password } = req.body as UserLogin;

  try {
    // Check user exists
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const user = await User.findOne({
      isDeleted: false,
      $or: orConditions,
    });
    if (!user) {
      throw new HttpError(404, "User not found, please sign up first.");
    }

    // Check user is locked
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    // Check user is verified or not
    if (email && !user.isEmailVerified) {
      throw new HttpError(
        403,
        "Email not verified. Please verify your email first."
      );
    } else if (phoneNumber && !user.isPhoneNumberVerified) {
      throw new HttpError(
        403,
        "Phone number not verified. Please verify your phone number first."
      );
    }

    // Check password or user is locked
    if (!bcrypt.compareSync(password, user.password) || user.isLocked) {
      throw new HttpError(401, "Invalid credentials.");
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();

    // Set JWT and send cookie
    genJWTAndSetCookie(res, user._id.toString(), true);

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

// Login user at this function
export async function verifyUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("▶️", "Processing user verification request...");
  const userId = (req["auth"] as RequestAuth).userId;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Check user is locked
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    // Check valid OTP
    const { type, code } = req.body as UserVerify;
    const otp = await Otp.findOne({
      userId,
      code,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })
      .lean()
      .session(session);
    if (!otp) {
      throw new HttpError(400, "Invalid or expired verification code.");
    }

    // Invalidate ALL pending OTPs for this user and type for security
    await Otp.updateMany(
      { userId, type, isUsed: false },
      { $set: { isUsed: true } },
      { session }
    );

    // Update user verification status
    user[type === "email" ? "isEmailVerified" : "isPhoneNumberVerified"] = true;

    // Update stripeCustomerId if has
    if (user.stripeCustomerId) {
      const customerData: any = {};
      if (type === "email") {
        customerData["email"] = user.email as string;
      } else {
        customerData["phone"] = user.phoneNumber as string;
      }
      try {
        await stripe.customers.update(user.stripeCustomerId, customerData);
        console.log("✅ ", "Stripe customer updated successfully.");
      } catch (error) {
        console.error("❌ ", "Error updating Stripe customer:", error);
      }
    }

    // Send welcome email if email is verified with first login
    if (user.lastLogin === undefined) {
      if (type === "email") {
        await sendWelcomeEmail(user.email as string, user.fullName);
      }
      user.lastLogin = new Date();
    }

    await user.save({ session });

    await session.commitTransaction();

    // Refresh JWT and set cookie with isVerified is true
    genJWTAndSetCookie(res, user._id.toString(), true);

    res.status(200).json({
      success: true,
      message: "User verified successfully.",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
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
  const { idToken, accessToken } = req.body as UserAuthByGoogle;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Verify Google ID token using the Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Extract trusted user info from the decoded token
    const { name: fullName, email, picture: avatarUrl } = decodedToken;

    if (!email) {
      throw new HttpError(400, "Email not available from Google account.");
    }

    // Check user exists
    const user = await User.findOne({
      isDeleted: false,
      email,
    }).session(session);

    // User not exists -> create new user -> login
    if (!user) {
      // Use accessToken to fetch additional profile data
      let birth: Date | undefined,
        gender: (typeof USER_GENDER_OPTIONS)[number] | undefined;
      try {
        const res = await fetch(
          "https://people.googleapis.com/v1/people/me?personFields=birthdays,genders",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(
            `Google People API request failed with status ${res.status}`
          );
        }

        const person = await res.json();

        // Extract gender
        if (
          person.genders &&
          person.genders.length > 0 &&
          person.genders[0].value
        ) {
          gender = person.genders[0].value.toLowerCase();
        }

        // Extract birth date
        if (person.birthdays && person.birthdays.length > 0) {
          const bday = person.birthdays.find((b: any) => b.date);
          if (bday && bday.date) {
            const { year, month, day } = bday.date;
            if (year && month && day) {
              birth = new Date(Date.UTC(year, month - 1, day));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch Google profile data:", error);
        // Continue with default values...
      }

      if (!birth) {
        const currentDate = new Date();
        currentDate.setFullYear(
          currentDate.getFullYear() - USER_DEFAULT_BIRTH_GAP
        );
        birth = currentDate;
      }
      if (!gender || !USER_GENDER_OPTIONS.includes(gender)) gender = "other";

      const roleAssignment = await assignDefaultBuyerRole(session);
      const hashedPassword = await bcrypt.hash(genRandomPassword(), HASH_SALT);
      const newUser = new User({
        fullName,
        avatarUrl,
        email,
        isEmailVerified: true, // Automatically verify email for Google users
        password: hashedPassword,
        birth,
        gender,
        authProvider: "google",
        lastLogin: new Date(),
        roles: [
          {
            id: roleAssignment.roleId,
            assignedBy: roleAssignment.assignedBy,
          },
        ],
      });

      await newUser.save({ session });

      await sendWelcomeEmail(email, fullName);

      await session.commitTransaction();

      genJWTAndSetCookie(res, newUser._id.toString(), true);

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

    // User exists -> proceed with login
    // Check user is locked
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    // Login user
    user.isEmailVerified = true; // Make sure email is verified for Google users
    user.lastLogin = new Date();
    await user.save({ session });

    await session.commitTransaction();

    genJWTAndSetCookie(res, user._id.toString(), true);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "Google login process completed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Processing forgot password request...");
  const { email, phoneNumber } = req.body as UserForgotPassword;

  try {
    // Check user exists and verified
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const user = await User.findOne({
      isDeleted: false,
      $or: orConditions,
    }).lean();
    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    // Check user is locked
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    if (email && !user.isEmailVerified) {
      throw new HttpError(403, "Email not verified.");
    } else if (phoneNumber && !user.isPhoneNumberVerified) {
      throw new HttpError(403, "Phone number not verified.");
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const tokenExpiry = new Date(Date.now() + RESET_TOKEN_TLL);
    const passwordResetToken = new PasswordResetToken({
      userId: user._id,
      token: resetToken,
      expiresAt: tokenExpiry,
    });

    await passwordResetToken.save();

    if (email) {
      await sendPasswordResetEmail(email, resetToken);
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
    // Check reset token exists
    const passwordResetToken = await PasswordResetToken.findOne({
      token: resetToken,
      expiresAt: { $gt: new Date() },
      isUsed: false,
    })
      .lean()
      .session(session);
    if (!passwordResetToken) {
      throw new HttpError(400, "Invalid or expired password reset token.");
    }

    // Check user exists
    const user = await User.findById(passwordResetToken.userId).session(
      session
    );
    if (!user || user.isDeleted) {
      throw new HttpError(400, "User not found.");
    }

    // Check user is locked
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    // Update user password
    const hashedResetPassword = await bcrypt.hash(req.body.password, HASH_SALT);
    user.password = hashedResetPassword;
    await user.save({ session });

    // Mark ALL reset tokens as used
    await PasswordResetToken.updateMany(
      { userId: user._id, isUsed: false },
      { $set: { isUsed: true } },
      { session }
    );

    // Send email or SMS notification
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

export async function checkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Checking authentication status...");
  const userId = (req["auth"] as RequestAuth).userId;

  try {
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }

    const user = await User.findById(userId).lean();
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }
    if (user.isLocked) {
      throw new HttpError(403, "User account is locked.");
    }

    const isAuth = user.isEmailVerified || user.isPhoneNumberVerified;

    res.status(200).json({
      success: true,
      message: isAuth
        ? "User is authenticated."
        : "User is registered but not authenticated.",
      data: {
        user: formatUserResponse(user),
        isAuth,
      },
    } as SuccessResponse<CheckAuthResponse>);
    console.log("✅", "Authentication check completed successfully.");
  } catch (error) {
    next(error);
  }
}

export async function validatePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Validating user password...");
  const userId = req["auth"]?.userId;
  if (!userId) {
    return next(
      new HttpError(
        500,
        "userId not found, this should be handled by middlewares."
      )
    );
  }
  const { password } = req.body as UserValidatePassword;

  try {
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }

    const user = await User.findById(userId).lean();
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Check password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(401, "Invalid password.");
    }

    res.status(200).json({
      success: true,
      message: "Password is valid.",
    } as SuccessResponse);
    console.log("✅", "Password validation completed successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function assignDefaultBuyerRole(
  session: mongoose.ClientSession
): Promise<{ roleId: Types.ObjectId; assignedBy: Types.ObjectId }> {
  try {
    const buyerRoleId = getBuyerRoleId();
    const sysUserId = getSysUserId();

    await Role.updateOne(
      { _id: buyerRoleId },
      { $inc: { userAssigned: 1 } },
      { session }
    );

    return { roleId: buyerRoleId, assignedBy: sysUserId };
  } catch (error) {
    console.error("❌ ", "Error assigning default buyer role:", error);
    throw error;
  }
}
