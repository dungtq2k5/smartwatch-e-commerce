import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyProductModelInput,
} from "../../utils/middlewares/product.middleware";
import {
  get,
  update,
  remove,
} from "../../controllers/product/productModel.controller";

const router = express.Router();

// Some routes in product.route.ts

router.get("/:modelId", get);

router.patch(
  "/:modelId",
  verifyPermission("u_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyProductModelInput("update"),
  update
);

router.delete("/:modelId", verifyPermission("d_product_model"), remove);

export default router;
