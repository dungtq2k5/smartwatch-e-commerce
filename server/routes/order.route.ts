import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeOrderInput,
  sanitizeSearchOrderInput,
  verifyOrderInput,
} from "../utils/middlewares/order.middleware";
import {
  createSelf,
  getSelf,
  update,
  updateSelf,
  searchSelf,
} from "../controllers/order/order.controller";
import * as paymentController from "../controllers/order/payment.controller";
import { verifyProductInput } from "../utils/middlewares/product.middleware";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_order"),
  verifyEmptyBody,
  sanitizeOrderInput,
  verifyOrderInput("create"),
  createSelf
);

router.get(
  "/",
  verifyPermission("r_order"),
  sanitizeSearchOrderInput,
  verifyProductInput("search"),
  searchSelf,
);

router.get("/:id", verifyPermission("r_order"), getSelf);

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
  "/:id/create-checkout-session",
  verifyPermission("c_order"),
  paymentController.createCheckoutSession
);

export default router;
