import express from "express";
import { getAll } from "../../controllers/grn/grnState.controller";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";

const router = express.Router();

router.get("/", verifyPermission("r_grn"), getAll);

export default router;
