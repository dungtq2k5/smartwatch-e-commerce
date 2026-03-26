import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import {
  inputSanitizer,
  verifyReturnInput,
} from "../../utils/middlewares/orderReturn.middleware";
import {
  searchSelf,
  get,
  getDetails,
  updateSelf,
  updateState,
  updatePickupState,
  search,
  adminGetDetails,
  updateStateBulk,
  updatePickupStateBulk,
  adminGet,
} from "../../controllers/returnRefund/orderReturn.controller";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";

const router = express.Router();

// Some routes in order.route.ts

router.get(
  "/",
  verifyPermission("r_order_return"),
  inputSanitizer("return admin search"),
  verifyReturnInput("admin search"),
  search,
);

router.get(
  "/me",
  verifyPermission("r_order_return"),
  verifyReturnInput("search"),
  searchSelf,
);

router.get(
  "/:returnId/details/admin",
  verifyPermission("r_order_return"),
  adminGetDetails,
);

router.get(
  "/:returnId/details",
  verifyPermission("r_order_return"),
  getDetails,
);

router.get("/:returnId/admin", verifyPermission("r_order_return"), adminGet);

router.get("/:returnId", verifyPermission("r_order_return"), get);

router.patch(
  "/me/:returnId",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("return"),
  verifyReturnInput("update"),
  updateSelf,
);

router.patch(
  "/state/many",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("return state update bulk"),
  verifyReturnInput("update state bulk"),
  updateStateBulk,
);

router.patch(
  "/pickup-state/many",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("return pickup state update bulk"),
  verifyReturnInput("pickup state update bulk"),
  updatePickupStateBulk,
);

router.patch(
  "/:returnId/state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("return"),
  verifyReturnInput("update state"),
  updateState,
);

router.patch(
  "/:returnId/pickup-state",
  verifyPermission("u_order_return"),
  verifyEmptyBody,
  inputSanitizer("return"),
  verifyReturnInput("update pickup state"),
  updatePickupState,
);

export default router;
