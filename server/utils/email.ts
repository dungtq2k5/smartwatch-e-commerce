import { PROJECT_NAME } from "../../common/configs.common";
import { formatError } from "../../common/utils.common";
import { transporter, sender } from "../configs/nodemailer.config";

export async function sendVerificationEmail(
  email: string,
  verificationCode: string
): Promise<void> {
  console.log("▶️", "Sending verification email...");

  const mailOptions = {
    from: sender,
    to: email,
    subject: `Verify your email address from ${PROJECT_NAME}`,
    text: `Your verification code is: ${verificationCode}`,
    html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
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
    html: `<p>Hello <strong>${userName}</strong>, welcome to ${PROJECT_NAME}!</p>`,
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
    html: `<p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Password reset email sent successfully:", info.response);
  } catch (error) {
    throw new Error(`Failed to send password reset email: ${formatError(error)}`);
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
    html: "<p>Your password has been successfully reset.</p>",
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
      ? `Your account has been locked due to some reasons, ${userName}`
      : `Your account has been unlocked, ${userName}`,
    text: isLocked
      ? `Dear ${userName}, your account has been locked due to some reasons.`
      : `Dear ${userName}, your account has been unlocked.`,
    html: isLocked
      ? `<p>Dear <strong>${userName}</strong>, your account has been locked due to some reasons.</p>`
      : `<p>Dear <strong>${userName}</strong>, your account has been unlocked.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅", "Account unlock email sent successfully:", info.response);
  } catch (error) {
    throw new Error(`Failed to send account unlock email: ${formatError(error)}`);
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
    subject: `Your email has been updated, ${userName}`,
    text: isVerified
      ? `Dear ${userName}, your email has been successfully updated from ${currEmail} to ${newEmail} and verified.`
      : `Dear ${userName}, your email has been updated from ${currEmail} to ${newEmail}.`,
    html: isVerified
      ? `<p>Dear <strong>${userName}</strong>, your email has been successfully updated from ${currEmail} to ${newEmail} and verified</p>`
      : `<p>Dear <strong>${userName}</strong>, your email has been updated from ${currEmail} to ${newEmail}.</p>`,
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
    subject: `Your phone number has been updated, ${userName}`,
    text: isVerified
      ? `Dear ${userName}, your phone number has been successfully updated from ${currPhoneNumber} to ${newPhoneNumber} and verified.`
      : `Dear ${userName}, your phone number has been updated from ${currPhoneNumber} to ${newPhoneNumber}.`,
    html: isVerified
      ? `<p>Dear <strong>${userName}</strong>, your phone number has been successfully updated from ${currPhoneNumber} to ${newPhoneNumber} and verified</p>`
      : `<p>Dear <strong>${userName}</strong>, your phone number has been updated from ${currPhoneNumber} to ${newPhoneNumber}.</p>`,
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
      ? `Your email has been verified, ${userName}`
      : `Your email has been unverified, ${userName}`,
    text: isVerified
      ? `Dear ${userName}, your email has been successfully verified.`
      : `Dear ${userName}, your email has been unverified due to some reasons.`,
    html: isVerified
      ? `<p>Dear <strong>${userName}</strong>, your email has been successfully verified.</p>`
      : `<p>Dear <strong>${userName}</strong>, your email has been unverified due to some reasons.</p>`,
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
      ? `Your phone number has been verified, ${userName}`
      : `Your phone number has been unverified, ${userName}`,
    text: isVerified
      ? `Dear ${userName}, your phone number has been successfully verified.`
      : `Dear ${userName}, your phone number has been unverified due to some reasons.`,
    html: isVerified
      ? `<p>Dear <strong>${userName}</strong>, your phone number has been successfully verified.</p>`
      : `<p>Dear <strong>${userName}</strong>, your phone number has been unverified due to some reasons.</p>`,
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
