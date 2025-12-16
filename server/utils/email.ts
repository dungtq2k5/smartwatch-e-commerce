import {
  PROJECT_NAME,
  VERIFICATION_CODE_TTL,
} from "../../common/configs.common";
import { formatError } from "../../common/utils.common";
import { transporter, sender } from "../configs/nodemailer.config";

// --- Template Helper & Styles ---

const getHtmlTemplate = (title: string, bodyContent: string): string => {
  const primaryColor = "#0d6efd";
  const lightColor = "#f8f9fa";
  const darkColor = "#212529";
  const textColor = "#495057";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: ${darkColor}; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: ${primaryColor}; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase; }
        .content { padding: 40px 30px; line-height: 1.6; font-size: 16px; color: ${textColor}; }
        .footer { background-color: ${lightColor}; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef; }
        .btn { display: inline-block; padding: 12px 28px; background-color: ${primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 50px; font-weight: 600; margin-top: 20px; text-align: center; box-shadow: 0 2px 5px rgba(13, 110, 253, 0.3); }
        .btn:hover { background-color: #0b5ed7; }
        .code-box { background-color: ${lightColor}; border: 1px dashed #dee2e6; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
        .code { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: ${primaryColor}; font-family: 'Courier New', monospace; }
        .info-box { background-color: #e7f1ff; border-left: 4px solid ${primaryColor}; padding: 15px; margin: 20px 0; border-radius: 4px; color: #084298; font-size: 14px; }
        h2 { color: ${darkColor}; font-size: 20px; margin-top: 0; }
        strong { font-weight: 600; color: ${darkColor}; }
        a { color: ${primaryColor}; text-decoration: none; }
        a:hover { text-decoration: underline; }
        @media only screen and (max-width: 600px) {
          .container { width: 100%; margin: 0; border-radius: 0; }
          .content { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${PROJECT_NAME}</h1>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${PROJECT_NAME}. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// --- Email Templates ---

const VERIFICATION_EMAIL_TEMPLATE = (username: string, code: string) =>
  getHtmlTemplate(
    "Verify Your Email",
    `
    <h2>Verify your email address</h2>
    <p>Hello ${username},</p>
    <p>Thank you for signing up with <strong>${PROJECT_NAME}</strong>. To complete your registration, please verify your email address by entering the code below:</p>
    <div class="code-box">
      <span class="code">${code}</span>
    </div>
    <p>This code will expire in ${
      VERIFICATION_CODE_TTL / (60 * 1000)
    } minutes.</p>
    <p>If you did not request this code, please ignore this email.</p>
  `
  );

const WELCOME_EMAIL_TEMPLATE = (userName: string) =>
  getHtmlTemplate(
    `Welcome to ${PROJECT_NAME}!`,
    `
    <h2>Welcome, ${userName}!</h2>
    <p>We are thrilled to have you on board. <strong>${PROJECT_NAME}</strong> is your destination for the best smartwatches and accessories.</p>
    <p>Feel free to explore our latest collections and find the perfect match for your lifestyle.</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}" class="btn">Start Shopping</a>
    </div>
  `
  );

const PASSWORD_RESET_TEMPLATE = (resetLink: string) =>
  getHtmlTemplate(
    "Password Reset Request",
    `
    <h2>Reset Your Password</h2>
    <p>We received a request to reset the password for your account at <strong>${PROJECT_NAME}</strong>.</p>
    <p>Please click the button below to reset your password:</p>
    <div style="text-align: center;">
      <a href="${resetLink}" class="btn">Reset Password</a>
    </div>
    <p style="margin-top: 30px; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 13px; word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
    <div class="info-box">
      If you did not request a password reset, please ignore this email. Your password will remain unchanged.
    </div>
  `
  );

const PASSWORD_RESET_SUCCESS_TEMPLATE = () =>
  getHtmlTemplate(
    "Password Reset Successful",
    `
    <h2>Password Reset Successful</h2>
    <p>Your password has been successfully reset.</p>
    <p>You can now log in to your account with your new password.</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/login" class="btn">Log In Now</a>
    </div>
  `
  );

const ACCOUNT_LOCK_TEMPLATE = (userName: string, isLocked: boolean) =>
  getHtmlTemplate(
    isLocked ? "Account Locked" : "Account Unlocked",
    `
    <h2>${isLocked ? "Account Locked" : "Account Unlocked"}</h2>
    <p>Dear <strong>${userName}</strong>,</p>
    <p>
      ${
        isLocked
          ? "Your account has been locked due to security reasons or policy violations. Please contact support if you believe this is a mistake."
          : "Good news! Your account has been unlocked. You can now access all features of our service again."
      }
    </p>
    ${
      !isLocked
        ? `<div style="text-align: center;"><a href="${process.env.CLIENT_URL}" class="btn">Go to Website</a></div>`
        : ""
    }
  `
  );

const EMAIL_CHANGE_TEMPLATE = (
  currEmail: string,
  newEmail: string,
  userName: string,
  isVerified: boolean
) =>
  getHtmlTemplate(
    "Email Address Updated",
    `
    <h2>Email Address Updated</h2>
    <p>Dear <strong>${userName}</strong>,</p>
    <p>Your email address has been updated from <strong>${currEmail}</strong> to <strong>${newEmail}</strong>.</p>
    ${
      isVerified
        ? `<div class="info-box">Your new email address has been successfully verified.</div>`
        : `<p>Please verify your new email address to ensure full account access.</p>`
    }
    <p>If you did not authorize this change, please contact our support team immediately.</p>
  `
  );

const PHONE_CHANGE_TEMPLATE = (
  currPhone: string,
  newPhone: string,
  userName: string,
  isVerified: boolean
) =>
  getHtmlTemplate(
    "Phone Number Updated",
    `
    <h2>Phone Number Updated</h2>
    <p>Dear <strong>${userName}</strong>,</p>
    <p>Your phone number has been updated from <strong>${currPhone}</strong> to <strong>${newPhone}</strong>.</p>
    ${
      isVerified
        ? `<div class="info-box">Your new phone number has been successfully verified.</div>`
        : `<p>Please verify your new phone number.</p>`
    }
    <p>If you did not authorize this change, please contact our support team immediately.</p>
  `
  );

const VERIFICATION_STATUS_TEMPLATE = (
  type: "Email" | "Phone Number",
  userName: string,
  isVerified: boolean
) =>
  getHtmlTemplate(
    `${type} Verification Status`,
    `
    <h2>${type} ${isVerified ? "Verified" : "Unverified"}</h2>
    <p>Dear <strong>${userName}</strong>,</p>
    <p>
      ${
        isVerified
          ? `Your ${type.toLowerCase()} has been successfully <strong>verified</strong>.`
          : `Your ${type.toLowerCase()} is now <strong>unverified</strong> due to recent changes or administrative action.`
      }
    </p>
    ${
      isVerified
        ? `<div style="text-align: center;"><a href="${process.env.CLIENT_URL}" class="btn">Continue Shopping</a></div>`
        : ""
    }
  `
  );

// --- Exported Functions ---

export async function sendVerificationEmail(
  username: string,
  email: string,
  verificationCode: string
): Promise<void> {
  console.log("▶️", "Sending verification email...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Verify your email address for ${PROJECT_NAME}`,
    text: `Your verification code is: ${verificationCode}`,
    html: VERIFICATION_EMAIL_TEMPLATE(username, verificationCode),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Verification email sent successfully:", info.response);
  } catch (error) {
    throw new Error(`Failed to send verification email: ${formatError(error)}`);
  }
}

export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<void> {
  console.log("▶️", "Sending welcome email...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Welcome to ${PROJECT_NAME}, ${userName}!`,
    text: `Hello ${userName}, welcome to our website!`,
    html: WELCOME_EMAIL_TEMPLATE(userName),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Welcome email sent successfully:", info.response);
  } catch (error) {
    throw new Error(`Failed to send welcome email: ${formatError(error)}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  console.log("▶️", "Sending password reset email...");
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: sender,
    to: email,
    subject: "Password Reset Request",
    text: `Click the link to reset your password from ${PROJECT_NAME}: ${resetLink}`,
    html: PASSWORD_RESET_TEMPLATE(resetLink),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Password reset email sent successfully:", info.response);
  } catch (error) {
    throw new Error(
      `Failed to send password reset email: ${formatError(error)}`
    );
  }
}

export async function sendPasswordResetSuccessEmail(
  email: string
): Promise<void> {
  console.log("▶️", "Sending password reset success email...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: "Password Reset Successful",
    text: `Your password has been successfully reset from ${PROJECT_NAME}.`,
    html: PASSWORD_RESET_SUCCESS_TEMPLATE(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅",
      "Password reset success email sent successfully:",
      info.response
    );
  } catch (error) {
    throw new Error(
      `Failed to send password reset success email: ${formatError(error)}`
    );
  }
}

export async function sendLockAccountChangeEmail(
  email: string,
  userName: string,
  isLocked: boolean
): Promise<void> {
  console.log("▶️", "Sending account unlock email...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: isLocked
      ? `Your account has been locked - ${PROJECT_NAME}`
      : `Your account has been unlocked - ${PROJECT_NAME}`,
    text: isLocked
      ? `Dear ${userName}, your account has been locked due to some reasons.`
      : `Dear ${userName}, your account has been unlocked.`,
    html: ACCOUNT_LOCK_TEMPLATE(userName, isLocked),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Account unlock email sent successfully:", info.response);
  } catch (error) {
    throw new Error(
      `Failed to send account unlock email: ${formatError(error)}`
    );
  }
}

export async function sendEmailChangeEmail(
  email: string | string[],
  currEmail: string,
  newEmail: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending email updated notification...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Your email has been updated - ${PROJECT_NAME}`,
    text: `Dear ${userName}, your email has been updated from ${currEmail} to ${newEmail}.`,
    html: EMAIL_CHANGE_TEMPLATE(currEmail, newEmail, userName, isVerified),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅",
      "Email updated notification sent successfully:",
      info.response
    );
  } catch (error) {
    throw new Error(
      `Failed to send email updated notification: ${formatError(error)}`
    );
  }
}

export async function sendPhoneNumberChangeEmail(
  email: string | string[],
  currPhoneNumber: string,
  newPhoneNumber: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending phone number updated notification...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Your phone number has been updated - ${PROJECT_NAME}`,
    text: `Dear ${userName}, your phone number has been updated from ${currPhoneNumber} to ${newPhoneNumber}.`,
    html: PHONE_CHANGE_TEMPLATE(
      currPhoneNumber,
      newPhoneNumber,
      userName,
      isVerified
    ),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅",
      "Phone number updated notification sent successfully:",
      info.response
    );
  } catch (error) {
    throw new Error(
      `Failed to send phone number updated notification: ${formatError(error)}`
    );
  }
}

export async function sendEmailVerifiedEmail(
  email: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending email verified notification...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: isVerified
      ? `Email Verified - ${PROJECT_NAME}`
      : `Email Unverified - ${PROJECT_NAME}`,
    text: isVerified
      ? `Dear ${userName}, your email has been successfully verified.`
      : `Dear ${userName}, your email has been unverified.`,
    html: VERIFICATION_STATUS_TEMPLATE("Email", userName, isVerified),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅",
      "Email verified notification sent successfully:",
      info.response
    );
  } catch (error) {
    throw new Error(
      `Failed to send email verified notification: ${formatError(error)}`
    );
  }
}

export async function sendPhoneNumberVerifiedEmail(
  email: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending phone number verified notification...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: isVerified
      ? `Phone Number Verified - ${PROJECT_NAME}`
      : `Phone Number Unverified - ${PROJECT_NAME}`,
    text: isVerified
      ? `Dear ${userName}, your phone number has been successfully verified.`
      : `Dear ${userName}, your phone number has been unverified.`,
    html: VERIFICATION_STATUS_TEMPLATE("Phone Number", userName, isVerified),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "✅",
      "Phone number verified notification sent successfully:",
      info.response
    );
  } catch (error) {
    throw new Error(
      `Failed to send phone number verified notification: ${formatError(error)}`
    );
  }
}
