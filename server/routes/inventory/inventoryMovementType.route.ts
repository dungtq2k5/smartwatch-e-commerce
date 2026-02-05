import express from "express";
import { getAll } from "../../controllers/inventory/inventoryMovementType.controller";

const router = express.Router();

router.get("/", getAll);

export default router;
