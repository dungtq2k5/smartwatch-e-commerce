import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import {
  setupBankAccount,
  refreshOnboardingUrl,
  getSelfAll,
  getSelf,
  setSelfAsDefault,
  removeSelf,
} from "../../controllers/user/bankAccount.controller";

const router = express.Router();

router.post(
  "/me/setup-intent",
  verifyPermission("r_usr_bankacc"),
  setupBankAccount
);

router.post(
  "/me/:bankAccountId/refresh-onboarding",
  verifyPermission("u_usr_bankacc"),
  refreshOnboardingUrl
);

router.get("/me", verifyPermission("r_usr_bankacc"), getSelfAll);

router.get("/me/:bankAccountId", verifyPermission("r_usr_bankacc"), getSelf);

router.patch(
  "/me/:bankAccountId/set-default",
  verifyPermission("u_usr_bankacc"),
  setSelfAsDefault
);

router.delete(
  "/me/:bankAccountId",
  verifyPermission("d_usr_bankacc"),
  removeSelf
);

export default router;
