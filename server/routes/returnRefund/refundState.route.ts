import express from "express";
import { getAll } from "../../controllers/returnRefund/refundState.controller";

const router = express.Router();

router.get("/", getAll);

export default router;