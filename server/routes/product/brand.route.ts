import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyBrandInput,
} from "../../utils/middlewares/product/product.middleware";
import {
  create,
  get,
  getAll,
  remove,
  update,
} from "../../controllers/product/brand.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("create"),
  create
);

router.get("/:brandId", get);

router.get("/", getAll);

router.patch(
  "/:brandId",
  verifyPermission("u_product_brand"),
  verifyEmptyBody,
  inputSanitizer("brand"),
  verifyBrandInput("update"),
  update
);

router.delete("/:brandId", verifyPermission("d_product_brand"), remove);

export default router;
