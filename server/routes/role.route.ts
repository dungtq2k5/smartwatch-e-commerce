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

router.post(
  "/",
  verifyPermission("c_usr_role"),
  verifyEmptyBody,
  sanitizeRoleInput,
  verifyRoleInput("create"),
  create
);

router.get("/:id", verifyPermission("r_usr_role"), get);
router.get("/", verifyPermission("r_usr_role"), getAll);

router.patch(
  "/:id",
  verifyPermission("u_usr_role"),
  verifyEmptyBody,
  sanitizeRoleInput,
  verifyRoleInput("update"),
  update
);

router.delete("/:id", verifyPermission("d_usr_role"), remove);

export default router;
