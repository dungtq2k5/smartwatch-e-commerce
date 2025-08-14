import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeOrderInput,
  verifyOrderInput,
  verifyPaymentIntentInput,
} from "../utils/middlewares/order.middleware";
import {
  create,
  get,
  update,
  updateSelf,
} from "../controllers/order/order.controller";
import * as paymentController from "../controllers/order/payment.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_order"),
  verifyEmptyBody,
  sanitizeOrderInput,
  verifyOrderInput("create"),
  create
);

router.get("/:id", verifyPermission("r_order"), get);

router.patch(
  "/self/:id",
  verifyPermission("u_order"),
  verifyEmptyBody,
  verifyOrderInput("update"),
  updateSelf
);
router.patch(
  "/:id",
  verifyPermission("u_order"),
  verifyEmptyBody,
  verifyOrderInput("update"),
  update
);

// -- routes for order payment
router.post(
  "/:id/create-payment-intent",
  verifyPermission("c_order"),
  verifyPaymentIntentInput("create"),
  paymentController.createPaymentIntent
);

export default router;
