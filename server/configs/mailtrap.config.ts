import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

const { MAILTRAP_TOKEN, MAILTRAP_SENDER_EMAIL, MAILTRAP_SENDER_NAME } = process.env as { [key: string]: string };

export const mailtrapClient = new MailtrapClient({
  token: MAILTRAP_TOKEN,
});

export const sender = {
  email: MAILTRAP_SENDER_EMAIL,
  name: MAILTRAP_SENDER_NAME,
};

// const recipients = [
//   {
//     email: "dungtranquang2005@gmail.com",
//   },
// ];

// client
//   .send({
//     from: sender,
//     to: recipients,
//     subject: "You are awesome!",
//     text: "Congrats for sending test email with Mailtrap!",
//     category: "Integration Test",
//   })
//   .then(console.log, console.error);
