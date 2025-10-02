import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyOrderInput,
  verifyOrderReturnInput,
} from "../../utils/middlewares/order.middleware";
import * as order from "../../controllers/order/order.controller";
import * as returnController from "../../controllers/returnRefund/return.controller";
import { createCheckoutSession } from "../../controllers/stripe.controller";

const router = express.Router();

// -- route for order return
router.post(
  "/:id/return",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("create"),
  returnController.create
);

// search without orderId
router.get(
  "/returns",
  verifyPermission("r_order_return"),
  inputSanitizer("order return search"),
  verifyOrderReturnInput("search"),
  returnController.searchAll
);

// search within orderId
router.get(
  "/:id/returns",
  verifyPermission("r_order_return"),
  inputSanitizer("order return search"),
  verifyOrderReturnInput("search"),
  returnController.search
);

router.get(
  "/:id/returns/:returnId",
  verifyPermission("r_order_return"),
  returnController.get
);

router.get(
  "/:id/returns/:returnId/details",
  verifyPermission("r_order_return"),
  returnController.getDetails
);

router.patch(
  "/me/:id/returns/:returnId",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update"),
  returnController.updateSelf
);

router.patch(
  "/:id/returns/:returnId/state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update state"),
  returnController.updateState
);

router.patch(
  "/:id/returns/:returnId/pickup-state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update pickup state"),
  returnController.updatePickupState
);

// -- route for order
router.post(
  "/me",
  verifyPermission("c_order"),
  verifyEmptyBody,
  inputSanitizer("order"),
  verifyOrderInput("create"),
  order.createSelf
);

router.post(
  "/:id/fulfill-item",
  verifyPermission("u_order"),
  verifyEmptyBody,
  inputSanitizer("fulfill order item"),
  verifyOrderInput("update fulfill item"),
  order.fulfillItem
);

router.get(
  "/",
  verifyPermission("r_order"),
  inputSanitizer("order search"),
  verifyOrderInput("search"),
  order.search
);

router.get("/:id/details", verifyPermission("r_order"), order.getDetails);
router.get("/:id", verifyPermission("r_order"), order.get);

router.patch(
  "/me/:id",
  verifyPermission("u_order"),
  verifyEmptyBody,
  verifyOrderInput("update"),
  order.updateSelf
);
router.patch(
  "/:id",
  verifyPermission("u_order"),
  verifyEmptyBody,
  inputSanitizer("order"),
  verifyOrderInput("update"),
  order.updateDeliveryState
);

// -- routes for order payment
router.post(
  "/:id/create-checkout-session",
  verifyPermission("c_order"),
  createCheckoutSession
);

export default router;
