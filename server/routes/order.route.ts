import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import { sanitizeOrderInput, verifyOrderInput } from "../utils/middlewares/order.middleware";
import { create, get, update } from "../controllers/order/order.controller";

const router = express.Router();

// Also handle delete from cart
router.post(
  "/",
  verifyPermission("c_order"),
  verifyEmptyBody,
  sanitizeOrderInput,
  verifyOrderInput("create"),
  create
);

router.get(
  "/:id",
  verifyPermission("r_order"),
  get
);

// Updatable fields: deliveryStateId, estimateReceivedDate, deliveryAddressId (depend on deliveryStateId)
router.patch(
  "/:id",
  verifyPermission("u_order"),
  verifyEmptyBody,
  sanitizeOrderInput,
  verifyOrderInput("update"),
  update
);

export default router;