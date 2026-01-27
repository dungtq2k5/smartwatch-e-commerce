import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyOsInput,
} from "../../utils/middlewares/product/os.middleware";
import {
  create,
  adminSearch,
  get,
  getAll,
  remove,
  removeBulk,
  update,
  adminGet,
} from "../../controllers/product/os.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_os"),
  verifyEmptyBody,
  inputSanitizer("os"),
  verifyOsInput("create"),
  create,
);

router.get(
  "/admin",
  verifyPermission("r_product_os"),
  inputSanitizer("admin search"),
  verifyOsInput("admin search"),
  adminSearch,
);

router.get("/:osId/admin", verifyPermission("r_product_os"), adminGet);

router.get("/:osId", get);

router.get("/", getAll);

router.patch(
  "/:osId",
  verifyPermission("u_product_os"),
  verifyEmptyBody,
  inputSanitizer("os"),
  verifyOsInput("update"),
  update,
);

router.delete(
  "/many",
  verifyPermission("d_product_os"),
  verifyEmptyBody,
  inputSanitizer("delete many"),
  verifyOsInput("delete many"),
  removeBulk,
);

router.delete("/:osId", verifyPermission("d_product_os"), remove);

export default router;
