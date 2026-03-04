import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyOrderInput,
} from "../../utils/middlewares/order.middleware";
import {
  inputSanitizer as returnInputSanitizer,
  verifyOrderReturnInput,
} from "../../utils/middlewares/orderReturn.middleware";
import * as order from "../../controllers/order/order.controller";
import * as returnController from "../../controllers/returnRefund/orderReturn.controller";
import { createCheckoutSession } from "../../controllers/stripe.controller";

const router = express.Router();

// --- ROUTES FOR ORDER RETURN ---

router.post(
  "/:orderId/returns",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  returnInputSanitizer("order return"),
  verifyOrderReturnInput("create"),
  returnController.create,
);

// search within orderId
router.get(
  "/:orderId/returns",
  verifyPermission("r_order_return"),
  returnInputSanitizer("order return search"),
  verifyOrderReturnInput("search"),
  returnController.searchWithOrderId,
);

// --- ROUTES FOR ORDER ---
router.post(
  "/me",
  verifyPermission("c_order"),
  verifyEmptyBody,
  inputSanitizer("order"),
  verifyOrderInput("create"),
  order.createSelf,
);

router.get(
  "/",
  verifyPermission("r_order"),
  inputSanitizer("order admin search"),
  verifyOrderInput("admin search"),
  order.search,
);

router.get(
  "/me",
  verifyPermission("r_order"),
  inputSanitizer("order search"),
  verifyOrderInput("search"),
  order.searchSelf,
);

router.get(
  "/me/:orderId/details",
  verifyPermission("r_order"),
  order.getSelfDetails,
);

router.get("/me/:orderId", verifyPermission("r_order"), order.getSelf);

router.get("/:orderId/details", verifyPermission("r_order"), order.getDetails);

router.get("/:orderId", verifyPermission("r_order"), order.get);

router.patch(
  "/me/:orderId",
  verifyPermission("u_order"),
  verifyEmptyBody,
  verifyOrderInput("update"),
  order.updateSelf,
);

router.patch(
  "/many",
  verifyPermission("u_order"),
  verifyEmptyBody,
  inputSanitizer("order update bulk"),
  verifyOrderInput("update bulk"),
  order.updateBulk,
);

router.patch(
  "/:orderId/fulfill-item",
  verifyPermission("u_order"),
  verifyEmptyBody,
  inputSanitizer("fulfill order item"),
  verifyOrderInput("update fulfill item"),
  order.fulfillItem,
);

router.patch(
  "/:orderId",
  verifyPermission("u_order"),
  verifyEmptyBody,
  inputSanitizer("order"),
  verifyOrderInput("update"),
  order.update,
);

// -- ROUTES FOR STRIPE CHECKOUT SESSION
router.post(
  "/:orderId/create-checkout-session",
  verifyPermission("c_order"),
  createCheckoutSession,
);

export default router;
