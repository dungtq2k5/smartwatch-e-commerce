import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody }  from "../../utils/middlewares/general.middleware";
import { inputSanitizer, verifyCategoryInput } from "../../utils/middlewares/product.middleware";
import { create, get, remove, update } from "../../controllers/product/category.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_cat"),
  verifyEmptyBody,
  inputSanitizer("category"),
  verifyCategoryInput("create"),
  create
);

router.get(
  "/",
  get
);

router.patch(
  "/:id",
  verifyPermission("u_product_cat"),
  verifyEmptyBody,
  inputSanitizer("category"),
  verifyCategoryInput("update"),
  update
);

router.delete(
  "/:id",
  verifyPermission("d_product_cat"),
  remove
);

export default router;