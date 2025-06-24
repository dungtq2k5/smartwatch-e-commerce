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
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

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

export async function sendLockAccountChangeSms(
  plainPhoneNumber: string,
  isLocked: boolean
): Promise<void> {
  console.log("▶️", "Sending account unlock SMS...");

  try {
    const message = await twilioClient.messages.create({
      body: isLocked
        ? `Your account in ${PROJECT_NAME} has been locked due to some reason.`
        : `Your account in ${PROJECT_NAME} has been unlocked. You can now access your account.`,
      from: twilioPhoneNumber,
      to: convertToE164(plainPhoneNumber),
    });

    console.log("✅", "Account unlock SMS sent successfully:", message.sid);
  } catch (error) {
    throw new Error(`Failed to send account unlock SMS: ${error.message}`);
  }
}

export async function sendPhoneNumberChangeSms(
  plainPhoneNumber: string | string[],
  currPhoneNumber: string,
  newPhoneNumber: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending phone number change SMS...");

  const phoneNumbers = Array.isArray(plainPhoneNumber)
    ? plainPhoneNumber
    : [plainPhoneNumber];

  for (const plainPhone of phoneNumbers) {
    try {
      const message = await twilioClient.messages.create({
        body: isVerified
          ? `Your phone number has been changed from ${currPhoneNumber} to ${newPhoneNumber} in ${PROJECT_NAME} and verified. If this was not you, please contact support.`
          : `Your phone number has been changed from ${currPhoneNumber} to ${newPhoneNumber} in ${PROJECT_NAME}. If this was not you, please contact support.`,
        from: twilioPhoneNumber,
        to: convertToE164(plainPhone),
      });

      console.log(
        "✅",
        "Phone number change SMS sent successfully:",
        message.sid
      );
    } catch (error) {
      throw new Error(
        `Failed to send phone number change SMS to ${plainPhoneNumber}: ${error.message}`
      );
    }
  }
}

export async function sendPhoneNumberVerifiedSms(
  plainPhoneNumber: string,
  userName: string,
  isVerified: boolean
): Promise<void> {
  console.log("▶️", "Sending phone number verified SMS...");

  try {
    const message = await twilioClient.messages.create({
      body: isVerified
        ? `Dear ${userName}, your phone number ${plainPhoneNumber} has been successfully verified in ${PROJECT_NAME}.`
        : `Dear ${userName}, your phone number ${plainPhoneNumber} has been unverified in ${PROJECT_NAME}. Please verify your new phone number.`,
      from: twilioPhoneNumber,
      to: convertToE164(plainPhoneNumber),
    });

    console.log(
      "✅",
      "Phone number verified SMS sent successfully:",
      message.sid
    );
  } catch (error) {
    throw new Error(
      `Failed to send phone number verified SMS: ${error.message}`
    );
  }
}
