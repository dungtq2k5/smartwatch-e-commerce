import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  create,
  adminSearch,
  get,
  getAll,
  update,
  remove,
  removeBulk,
  adminGet,
} from "../../controllers/product/brand.controller";
import {
  inputSanitizer,
  verifyBrandInput,
} from "../../utils/middlewares/product/brand.middleware";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("create"),
  create,
);

router.get(
  "/admin",
  verifyPermission("r_product_brand"),
  inputSanitizer("admin search"),
  verifyBrandInput("admin search"),
  adminSearch,
);

router.get("/:brandId/admin", verifyPermission("r_product_brand"), adminGet);

router.get("/:brandId", get);

router.get("/", getAll);

router.patch(
  "/:brandId",
  verifyPermission("u_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("update"),
  update,
);

router.delete(
  "/many",
  verifyPermission("d_product_brand"),
  verifyEmptyBody,
  inputSanitizer("delete many"),
  verifyBrandInput("delete many"),
  removeBulk,
);

router.delete("/:brandId", verifyPermission("d_product_brand"), remove);

export default router;
