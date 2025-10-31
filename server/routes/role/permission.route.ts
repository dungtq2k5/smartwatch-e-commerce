import express from "express";
import { getAll } from "../../controllers/role/permission.controller";

const router = express.Router();

router.get("/", getAll);

export default router;

