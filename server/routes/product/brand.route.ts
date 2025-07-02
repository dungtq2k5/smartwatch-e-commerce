import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody }  from "../../utils/middlewares/general.middleware";
import { inputSanitizer, verifyBrandInput } from "../../utils/middlewares/product.middleware";
import { create, getAll, remove, update } from "../../controllers/product/brand.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("create"),
  create
);

router.get(
  "/",
  verifyPermission("r_product_brand"),
  getAll
);

router.patch(
  "/:id",
  verifyPermission("u_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("update"),
  update
);

router.delete(
  "/:id",
  verifyPermission("d_product_brand"),
  remove
);

export default router;