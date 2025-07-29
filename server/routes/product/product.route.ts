import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyProductInput,
  verifyProductModelInput,
  verifyModelVariationInput,
  verifyVariationInstanceInput,
} from "../../utils/middlewares/product.middleware";
import * as productController from "../../controllers/product/product.controller";
import * as modelController from "../../controllers/product/productModel.controller";
import * as variationController from "../../controllers/product/modelVariation.controller";
import * as instanceController from "../../controllers/product/variationInstance.controller";

const router = express.Router();

// --- PRODUCT ROUTES ---
router.post(
  "/",
  verifyPermission("c_product"),
  verifyEmptyBody,
  inputSanitizer("product"),
  verifyProductInput("create"),
  productController.create
);

router.get("/:id", productController.get);

router.get(
  "/",
  inputSanitizer("product search"),
  verifyProductInput("search"),
  productController.search
);

router.patch(
  "/:id",
  verifyPermission("u_product"),
  verifyEmptyBody,
  inputSanitizer("product"),
  verifyProductInput("update"),
  productController.update
);

router.delete("/:id", verifyPermission("d_product"), productController.remove);

// --- PRODUCT MODEL ROUTES ---
router.post(
  "/:id/models",
  verifyPermission("c_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyProductModelInput("create"),
  modelController.create
);

router.get(
  "/:productId/models",
  verifyPermission("r_product_model"),
  modelController.get
);

router.get("/:productId/models/:id", modelController.get);

router.patch(
  "/:productId/models/:id",
  verifyPermission("u_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyProductModelInput("update"),
  modelController.update
);

router.delete(
  "/:productId/models/:id",
  verifyPermission("d_product_model"),
  modelController.remove
);

// --- MODEL VARIATION ROUTES ---
router.post(
  "/:productId/models/:modelId/variations",
  verifyPermission("c_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("create"),
  variationController.create
);

router.patch(
  "/:productId/models/:modelId/variations/:id",
  verifyPermission("u_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("update"),
  variationController.update
);

router.get(
  "/:productId/models/:modelId/variations",
  verifyPermission("r_model_variation"),
  variationController.get
);

router.get(
  "/:productId/models/:modelId/variations/:id",
  verifyPermission("r_model_variation"),
  variationController.get
);

router.delete(
  "/:productId/models/:modelId/variations/:id",
  verifyPermission("d_model_variation"),
  variationController.remove
);

// --- VARIATION INSTANCES ROUTES ---
router.post(
  "/:productId/models/:modelId/variations/:variationId/instances",
  verifyPermission("c_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("create"),
  instanceController.create
);

router.get(
  "/:productId/models/:modelId/variations/:variationId/instances/:id",
  verifyPermission("r_variation_instance"),
  instanceController.get
);

router.patch(
  "/:productId/models/:modelId/variations/:variationId/instances/:id",
  verifyPermission("u_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("update"),
  instanceController.update
);

export default router;
