import express from "express";
import { getAll } from "../../controllers/product/instanceCondition.controller";

const router = express.Router();

router.get("/", getAll);

export default router;