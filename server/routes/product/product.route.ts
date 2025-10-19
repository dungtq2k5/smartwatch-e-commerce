import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyModelVariationInput,
  verifyProductInput,
  verifyProductModelInput,
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

router.get("/:productId", productController.get);

// Query: modelStopSelling, variationStopSelling
router.get(
  "/:productId/details",
  inputSanitizer("product details"),
  verifyProductInput("details"),
  productController.getDetails
);

router.get(
  "/",
  inputSanitizer("product search"),
  verifyProductInput("search"),
  productController.search
);

router.patch(
  "/:productId",
  verifyPermission("u_product"),
  verifyEmptyBody,
  inputSanitizer("product"),
  verifyProductInput("update"),
  productController.update
);

router.delete(
  "/:productId",
  verifyPermission("d_product"),
  productController.remove
);

// -- PRODUCT MODEL ROUTES ---
router.post(
  "/:productId/models",
  verifyPermission("c_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyProductModelInput("create"),
  modelController.create
);

router.get("/:productId/models", modelController.getAllByProductId);

// --- MODEL VARIATION ROUTES ---
router.post(
  "/:productId/models/:modelId/variations",
  verifyPermission("c_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("create"),
  variationController.create
);

router.get(
  "/:productId/models/:modelId/variations",
  variationController.getAll
);

// --- VARIATION INSTANCE ROUTES ---
router.post(
  "/:productId/models/:modelId/variations/:variationId/instances",
  verifyPermission("c_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("create"),
  instanceController.create
);

export default router;
