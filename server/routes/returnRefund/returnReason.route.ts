import express from "express";
import { getAll } from "../../controllers/returnRefund/returnReason.controller";

const router = express.Router();

router.get("/", getAll);

export default router;