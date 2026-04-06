import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyWithdrawalRequestInput,
} from "../../utils/middlewares/user/withdrawalRequest.middleware";
import {
  createRequest,
  getSelf,
  searchSelf,
  cancelRequest,
  approveRequest,
  rejectRequest,
  adminSearch,
  adminGet,
} from "../../controllers/withdrawal/withdrawalRequest.controller";

const router = express.Router();

// --- ROUTES FOR THE AUTH BUYER (/me) ---

router.post(
  "/me",
  verifyPermission("c_withdrawal_req"),
  verifyEmptyBody,
  verifyWithdrawalRequestInput("create"),
  createRequest,
);

// For admin
router.get(
  "/",
  verifyPermission("r_withdrawal_req"),
  inputSanitizer("admin search"),
  verifyWithdrawalRequestInput("admin search"),
  adminSearch,
);

router.get(
  "/me",
  verifyPermission("r_withdrawal_req"),
  verifyWithdrawalRequestInput("search"),
  searchSelf,
);

router.get("/me/:requestId", verifyPermission("r_withdrawal_req"), getSelf);

// For admin
router.get("/:requestId", verifyPermission("r_withdrawal_req"), adminGet);

router.patch(
  "/me/:requestId/cancel",
  verifyPermission("u_withdrawal_req"),
  inputSanitizer("update"),
  verifyWithdrawalRequestInput("cancel request"),
  cancelRequest,
);

// For admin
router.patch(
  "/:requestId/approve",
  verifyPermission("u_withdrawal_req"),
  inputSanitizer("update"),
  verifyWithdrawalRequestInput("approve request"),
  approveRequest,
);

// For admin
router.patch(
  "/:requestId/reject",
  verifyPermission("u_withdrawal_req"),
  inputSanitizer("update"),
  verifyWithdrawalRequestInput("reject request"),
  rejectRequest,
);

export default router;
