import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import { verifyPaymentMethodInput } from "../../utils/middlewares/user/paymentMethod.middleware";
import { createSetupIntent } from "../../controllers/stripe.controller";
import {
  attachSelfPaymentMethod,
  getSelfAll,
  removeSelf,
  setSelfAsDefault,
} from "../../controllers/user/paymentMethod.controller";

const router = express.Router();

router.post(
  "/me/setup-intent",
  verifyPermission("c_usr_paym"),
  createSetupIntent
);

router.post(
  "/me",
  verifyPermission("r_usr_paym"),
  verifyEmptyBody,
  verifyPaymentMethodInput("create"),
  attachSelfPaymentMethod
);

router.get("/me", verifyPermission("r_usr_paym"), getSelfAll);

router.patch(
  "/me/:methodId/set-default",
  verifyPermission("u_usr_paym"),
  setSelfAsDefault
);

router.delete("/me/:methodId", verifyPermission("d_usr_paym"), removeSelf);

export default router;
