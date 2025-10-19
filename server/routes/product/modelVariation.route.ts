import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyModelVariationInput,
} from "../../utils/middlewares/product.middleware";
import {
  get,
  update,
  remove,
} from "../../controllers/product/modelVariation.controller";

const router = express.Router();

// Some routes in product.route.ts

router.patch(
  "/:variationId",
  verifyPermission("u_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("update"),
  update
);

router.get("/:variationId", get);

router.delete("/:variationId", verifyPermission("d_model_variation"), remove);

export default router;
