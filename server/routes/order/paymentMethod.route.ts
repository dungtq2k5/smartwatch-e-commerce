import express from "express";
import { getAll } from "../../controllers/order/paymentMethod.controller";

const router = express.Router();

router.get("/", getAll);

export default router;