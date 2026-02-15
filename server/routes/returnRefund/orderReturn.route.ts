import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import {
  inputSanitizer,
  verifyOrderReturnInput,
} from "../../utils/middlewares/orderReturn.middleware";
import {
  search,
  get,
  getDetails,
  updateSelf,
  updateState,
  updatePickupState,
} from "../../controllers/returnRefund/orderReturn.controller";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";

const router = express.Router();

// Some routes in order.route.ts

router.get(
  "/",
  verifyPermission("r_order_return"),
  inputSanitizer("order return search"),
  verifyOrderReturnInput("search"),
  search
);

router.get("/:returnId", verifyPermission("r_order_return"), get);

router.get(
  "/:returnId/details",
  verifyPermission("r_order_return"),
  getDetails
);

router.patch(
  "/me/:returnId",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update"),
  updateSelf
);

router.patch(
  "/:returnId/state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update state"),
  updateState
);

router.patch(
  "/:returnId/pickup-state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("order return"),
  verifyOrderReturnInput("update pickup state"),
  updatePickupState
);

export default router;
