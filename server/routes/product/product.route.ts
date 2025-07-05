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

router.get("/:id", verifyPermission("r_product"), productController.get);

/*
  limit, offset
  searchTerm (name, model, description)
  stopSelling,
  brandId,
  categoryId,
  sortBy: name, model, createdAt,...
  ...
*/
router.get("/", verifyPermission("r_product"), productController.search);

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
  "/:productId/models/:id",
  verifyPermission("r_product_model"),
  modelController.get
);

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

// -- COLOR VARIATION
router.post(
  "/:productId/models/:modelId/colors",
  verifyPermission("c_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("create", "color"),
  variationController.createColor
);

router.patch(
  "/:productId/models/:modelId/colors/:id",
  verifyPermission("u_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("update", "color"),
  variationController.updateColor
);

// -- BAND VARIATION
router.post(
  "/:productId/models/:modelId/bands",
  verifyPermission("c_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("create", "band"),
  variationController.createBand
);

router.patch(
  "/:productId/models/:modelId/bands/:id",
  verifyPermission("u_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyModelVariationInput("update", "band"),
  variationController.updateBand
);

// -- BOTH VARIATIONS
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
