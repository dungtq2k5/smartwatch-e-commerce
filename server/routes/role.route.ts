import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeRoleInput,
  verifyRoleInput,
} from "../utils/middlewares/role.middleware";
import {
  create,
  get,
  getAll,
  remove,
  update,
} from "../controllers/role.controller";

const router = express.Router();

// Create
router.post(
  "/",
  verifyPermission("c_usr_role"),
  verifyEmptyBody,
  sanitizeRoleInput,
  verifyRoleInput("create"),
  create
);

// Read
router.get("/:id", verifyPermission("r_usr_role"), get);
router.get("/", verifyPermission("r_usr_role"), getAll);

// Update
router.patch(
  "/:id",
  verifyPermission("u_usr_role"),
  verifyEmptyBody,
  sanitizeRoleInput,
  verifyRoleInput("update"),
  update
);

// Delete
router.delete("/:id", verifyPermission("d_usr_role"), remove);

export default router;
