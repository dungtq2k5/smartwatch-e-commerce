import { NextFunction } from "express";
import { mailtrapClient, sender } from "../configs/mailtrap.config";
import { PROJECT_NAME } from "../../common/configs.common";

export async function sendVerificationEmail(email: string, verificationCode: string): Promise<void> {
  console.log("▶️", "Sending verification email...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: `Verify your email address from ${PROJECT_NAME}`,
      text: `Your verification code is: ${verificationCode}`,
      html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>`,
      category: "Email Verification",
    });

    console.log("✅", "Verification email sent successfully:", res);
  } catch (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendWelcomeEmail(
  email: string,
  userName: string
): Promise<void> {
  console.log("▶️", "Sending welcome email...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: `Welcome to ${PROJECT_NAME}, ${userName}!`,
      text: `Hello ${userName}, welcome to our website!`,
      html: `<p>Hello <strong>${userName}</strong>, welcome to ${PROJECT_NAME}!</p>`,
      category: "Welcome Email",
    });

    console.log("✅", "Welcome email sent successfully:", res);
  } catch (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  next: NextFunction
): Promise<void> {
  console.log("▶️", "Sending password reset email...");
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: "Password Reset Request",
      text: `Click the link to reset your password from ${PROJECT_NAME}: ${resetLink}`,
      html: `<p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      category: "Password Reset",
    });

    console.log("✅", "Password reset email sent successfully:", res);
  } catch (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export async function sendPasswordResetSuccessEmail(email: string): Promise<void> {
  console.log("▶️", "Sending password reset success email...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: "Password Reset Successful",
      text: `Your password has been successfully reset from ${PROJECT_NAME}.`,
      html: "<p>Your password has been successfully reset.</p>",
      category: "Password Reset Success",
    });

    console.log("✅", "Password reset success email sent successfully:", res);
  } catch (error) {
    throw new Error(`Failed to send password reset success email: ${error.message}`);
  }
}