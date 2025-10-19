import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import {
  sanitizeBalanceHistorySearchInput,
  verifyBalanceHistorySearchInput,
} from "../../utils/middlewares/user/balanceHistory.middleware";
import { searchSelfBalanceHistory } from "../../controllers/user/balanceHistory.controller";

const router = express.Router();

/*
  Query params:
    - limit, offset
    - category: money_in(refund), money_out(withdraw, payment to)
    - createdAt: ISO date string
*/
router.get(
  "/me",
  verifyPermission("r_usr"),
  sanitizeBalanceHistorySearchInput,
  verifyBalanceHistorySearchInput,
  searchSelfBalanceHistory
);

export default router;
