import express from "express";
import { handleStripeWebhook } from "../controllers/stripe.controller";

const router = express.Router();

// This route is used by Stripe to send webhook events, not the client
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;