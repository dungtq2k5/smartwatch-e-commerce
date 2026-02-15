import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  sanitizeCartInput,
  verifyCartInput,
} from "../../utils/middlewares/cart.middleware";
import {
  createSelf,
  createBulkSelf,
  getSelfAll,
  updateSelf,
  removeSelf,
} from "../../controllers/user/cart.controller";

const router = express.Router();

router.post(
  "/me/many",
  verifyPermission("c_usr_cart"),
  verifyEmptyBody,
  sanitizeCartInput,
  verifyCartInput("create many"),
  createBulkSelf,
);

router.post(
  "/me",
  verifyPermission("c_usr_cart"),
  verifyEmptyBody,
  verifyCartInput("create"),
  createSelf,
);

router.get("/me", verifyPermission("r_usr_cart"), getSelfAll);

router.patch(
  "/me/:variationId",
  verifyPermission("u_usr_cart"),
  verifyEmptyBody,
  verifyCartInput("update"),
  updateSelf,
);

router.delete("/me/:variationId", verifyPermission("d_usr_cart"), removeSelf);

export default router;
