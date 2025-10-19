import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import { verifyWithdrawalRequestInput } from "../../utils/middlewares/user/withdrawalRequest.middleware";
import {
  createRequest,
  getSelf,
  searchSelf,
  cancelRequest,
  approveRequest,
  rejectRequest,
} from "../../controllers/withdrawal/withdrawalRequest.controller";

const router = express.Router();

// --- ROUTES FOR THE AUTH BUYER (/me) ---

router.post(
  "/me",
  verifyPermission("c_withdrawal_req"),
  verifyEmptyBody,
  verifyWithdrawalRequestInput("create"),
  createRequest
);

router.get(
  "/me/:requestId",
  verifyPermission("r_withdrawal_req"),
  getSelf
);

router.get(
  "/me",
  verifyPermission("r_withdrawal_req"),
  verifyWithdrawalRequestInput("search"),
  searchSelf
);

router.patch(
  "/me/:requestId/cancel",
  verifyPermission("u_withdrawal_req"),
  cancelRequest
);

// -- ROUTES FOR ADMIN ONLY ---
router.patch(
  "/:requestId/approve",
  verifyPermission("u_withdrawal_req"),
  verifyWithdrawalRequestInput("approve request"),
  approveRequest
);

router.patch(
  "/:requestId/reject",
  verifyPermission("u_withdrawal_req"),
  verifyWithdrawalRequestInput("reject request"),
  rejectRequest
);

export default router;
