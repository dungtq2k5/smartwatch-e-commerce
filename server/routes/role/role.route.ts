import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyRoleInput,
} from "../../utils/middlewares/role.middleware";
import {
  create,
  get,
  getAll,
  getDetails,
  remove,
  search,
  update,
} from "../../controllers/role/role.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_usr_role"),
  verifyEmptyBody,
  inputSanitizer("create"),
  verifyRoleInput("create"),
  create,
);

router.get(
  "/",
  verifyPermission("r_usr_role"),
  inputSanitizer("search"),
  verifyRoleInput("search"),
  search,
);

router.get("/all", verifyPermission("r_usr_role"), getAll);

router.get("/:roleId/details", verifyPermission("r_usr_role"), getDetails);

router.get("/:roleId", verifyPermission("r_usr_role"), get);

router.patch(
  "/:roleId",
  verifyPermission("u_usr_role"),
  verifyEmptyBody,
  inputSanitizer("update"),
  verifyRoleInput("update"),
  update,
);

router.delete("/:roleId", verifyPermission("d_usr_role"), remove);

export default router;
