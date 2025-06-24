import { mailtrapClient, sender } from "../configs/mailtrap.config";
import { PROJECT_NAME } from "../../common/configs.common";

export async function sendVerificationEmail(
  email: string,
  verificationCode: string
): Promise<void> {
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
  resetToken: string
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

export async function sendPasswordResetSuccessEmail(
  email: string
): Promise<void> {
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
    throw new Error(
      `Failed to send password reset success email: ${error.message}`
    );
  }
}

export async function sendLockAccountChangeEmail(
  email: string,
  userName: string,
  isLocked: boolean
): Promise<void> {
  console.log("▶️", "Sending account unlock email...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: isLocked
        ? `Your account has been locked due to some reasons, ${userName}`
        : `Your account has been unlocked, ${userName}`,
      text: isLocked
        ? `Dear ${userName}, your account has been locked due to some reasons.`
        : `Dear ${userName}, your account has been unlocked.`,
      html: isLocked
        ? `<p>Dear <strong>${userName}</strong>, your account has been locked due to some reasons.</p>`
        : `<p>Dear <strong>${userName}</strong>, your account has been unlocked.</p>`,
      category: "Account Lock/Unlock",
    });

    console.log("✅", "Account unlock email sent successfully:", res);
  } catch (error) {
    throw new Error(`Failed to send account unlock email: ${error.message}`);
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
  const recipients = [...email].map((e) => ({ email: e }));

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: `Your email has been updated, ${userName}`,
      text: isVerified
        ? `Dear ${userName}, your email has been successfully updated from ${currEmail} to ${newEmail} and verified.`
        : `Dear ${userName}, your email has been updated from ${currEmail} to ${newEmail}.`,
      html: isVerified
        ? `<p>Dear <strong>${userName}</strong>, your email has been successfully updated from ${currEmail} to ${newEmail} and verified</p>`
        : `<p>Dear <strong>${userName}</strong>, your email has been updated from ${currEmail} to ${newEmail}.</p>`,
      category: "Email Updated",
    });

    console.log("✅", "Email updated notification sent successfully:", res);
  } catch (error) {
    throw new Error(
      `Failed to send email updated notification: ${error.message}`
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
  const recipients = [...email].map((e) => ({ email: e }));

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: `Your phone number has been updated, ${userName}`,
      text: isVerified
        ? `Dear ${userName}, your phone number has been successfully updated from ${currPhoneNumber} to ${newPhoneNumber} and verified.`
        : `Dear ${userName}, your phone number has been updated from ${currPhoneNumber} to ${newPhoneNumber}.`,
      html: isVerified
        ? `<p>Dear <strong>${userName}</strong>, your phone number has been successfully updated from ${currPhoneNumber} to ${newPhoneNumber} and verified</p>`
        : `<p>Dear <strong>${userName}</strong>, your phone number has been updated from ${currPhoneNumber} to ${newPhoneNumber}.</p>`,
      category: "Phone Number Updated",
    });

    console.log(
      "✅",
      "Phone number updated notification sent successfully:",
      res
    );
  } catch (error) {
    throw new Error(
      `Failed to send phone number updated notification: ${error.message}`
    );
  }
}

export async function sendEmailVerifiedEmail(
  email: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending email verified notification...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: isVerified
        ? `Your email has been verified, ${userName}`
        : `Your email has been unverified, ${userName}`,
      text: isVerified
        ? `Dear ${userName}, your email has been successfully verified.`
        : `Dear ${userName}, your email has been unverified due to some reasons.`,
      html: isVerified
        ? `<p>Dear <strong>${userName}</strong>, your email has been successfully verified.</p>`
        : `<p>Dear <strong>${userName}</strong>, your email has been unverified due to some reasons.</p>`,
      category: "Email Verified",
    });

    console.log("✅", "Email verified notification sent successfully:", res);
  } catch (error) {
    throw new Error(
      `Failed to send email verified notification: ${error.message}`
    );
  }
}

export async function sendPhoneNumberVerifiedEmail(
  email: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending phone number verified notification...");
  const recipients = [{ email }];

  try {
    const res = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: isVerified
        ? `Your phone number has been verified, ${userName}`
        : `Your phone number has been unverified, ${userName}`,
      text: isVerified
        ? `Dear ${userName}, your phone number has been successfully verified.`
        : `Dear ${userName}, your phone number has been unverified due to some reasons.`,
      html: isVerified
        ? `<p>Dear <strong>${userName}</strong>, your phone number has been successfully verified.</p>`
        : `<p>Dear <strong>${userName}</strong>, your phone number has been unverified due to some reasons.</p>`,
      category: "Phone Number Verified",
    });

    console.log(
      "✅",
      "Phone number verified notification sent successfully:",
      res
    );
  } catch (error) {
    throw new Error(
      `Failed to send phone number verified notification: ${error.message}`
    );
  }
}
