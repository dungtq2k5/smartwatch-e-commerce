import express from "express";
import * as paymentController from "../controllers/order/payment.controller";

const router = express.Router();

// This route is used by Stripe to send webhook events, not the client
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook
);

export default router;