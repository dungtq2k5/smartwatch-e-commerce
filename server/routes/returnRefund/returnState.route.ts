import express from "express";
import { get, getAll } from "../../controllers/returnRefund/returnState.controller";

const router = express.Router();

router.get("/", getAll);

router.get("/:id", get);

export default router;
