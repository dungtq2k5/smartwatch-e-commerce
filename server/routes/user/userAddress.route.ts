import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  sanitizeAddressInput,
  verifyAddressInput,
} from "../../utils/middlewares/user/address.middleware";
import {
  createSelf,
  getSelfAll,
  getSelf,
  getSelfDefault,
  update,
  remove,
} from "../../controllers/user/address.controller";

const router = express.Router();

// Some routes are in user.route.ts

// --- ROUTES FOR THE AUTH BUYER (/me) ---
router.post(
  "/me",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  sanitizeAddressInput,
  verifyAddressInput("create"),
  createSelf
);

router.get("/me", verifyPermission("r_usr_addr"), getSelfAll);

router.get("/me/default", verifyPermission("r_usr_addr"), getSelfDefault);

router.get("/me/:addressId", verifyPermission("r_usr_addr"), getSelf);

router.patch(
  "/me/:addressId",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  sanitizeAddressInput,
  verifyAddressInput("update"),
  update
);

router.delete("/me/:addressId", verifyPermission("d_usr_addr"), remove);

export default router;
