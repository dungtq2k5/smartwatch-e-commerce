import { NextFunction } from "express";
import { twilioClient, twilioPhoneNumber } from "../configs/twilio.config";
import { PROJECT_NAME } from "../../common/configs.common";
import { convertToE164 } from "../../common/utils.common";

export async function sendVerificationSms(
  plainPhoneNumber: string,
  verificationCode: string
): Promise<void> {
  console.log("▶️", "Sending verification SMS...");

  try {
    const message = await twilioClient.messages.create({
      body: `Your verification code from ${PROJECT_NAME} is: ${verificationCode}`,
      from: twilioPhoneNumber,
      to: convertToE164(plainPhoneNumber),
    });

    console.log("✅", "Verification SMS sent successfully:", message.sid);
  } catch (error) {
    throw new Error(`Failed to send verification SMS: ${error.message}`);
  }
}

export async function sendPasswordResetSms(
  plainPhoneNumber: string,
  resetToken: string
): Promise<void> {
  console.log("▶️", "Sending password reset SMS...");
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

  try {
    const message = await twilioClient.messages.create({
      body: `To reset your password in ${PROJECT_NAME}, please visit: ${resetLink}`,
      from: twilioPhoneNumber,
      to: convertToE164(plainPhoneNumber),
    });

    console.log("✅", "Password reset SMS sent successfully:", message.sid);
  } catch (error) {
    throw new Error(`Failed to send password reset SMS: ${error.message}`);
  }
}

export async function sendPasswordResetSuccessSms(
  plainPhoneNumber: string
): Promise<void> {
  console.log("▶️", "Sending password reset success SMS...");

  try {
    const message = await twilioClient.messages.create({
      body: `Your password has been successfully reset in ${PROJECT_NAME}.`,
      from: twilioPhoneNumber,
      to: convertToE164(plainPhoneNumber),
    });

    console.log(
      "✅",
      "Password reset success SMS sent successfully:",
      message.sid
    );
  } catch (error) {
    throw new Error(
      `Failed to send password reset success SMS: ${error.message}`
    );
  }
}
