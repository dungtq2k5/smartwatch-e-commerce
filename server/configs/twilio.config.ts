import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_AUTH_PHONE } = process.env as {
  [key: string]: string;
};

export const twilioClient = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
export const twilioPhoneNumber = TWILIO_AUTH_PHONE;