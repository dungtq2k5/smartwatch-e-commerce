import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyProductInput,
} from "../../utils/middlewares/product/product.middleware";
import {
  create,
  adminSearch,
  search,
  adminGetDetails,
  getDetails,
  get,
  update,
  remove,
  removeBulk,
  adminGet,
} from "../../controllers/product/product.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product"),
  verifyEmptyBody,
  inputSanitizer("product"),
  verifyProductInput("create"),
  create
);

router.get(
  "/admin",
  verifyPermission("r_product"),
  inputSanitizer("admin product search"),
  verifyProductInput("admin search"),
  adminSearch
);

router.get(
  "/",
  inputSanitizer("product search"),
  verifyProductInput("search"),
  search
);

// Query: modelStopSelling, variationStopSelling
router.get(
  "/:productId/details/admin",
  verifyPermission("r_product"),
  inputSanitizer("admin product details"),
  verifyProductInput("admin details"),
  adminGetDetails
);

// Query: modelStopSelling, variationStopSelling
router.get(
  "/:productId/details",
  inputSanitizer("product details"),
  verifyProductInput("details"),
  getDetails
);

router.get(
  "/:productId/admin",
  verifyPermission("r_product"),
  adminGet
);

router.get("/:productId", get);

router.patch(
  "/:productId",
  verifyPermission("u_product"),
  verifyEmptyBody,
  inputSanitizer("product"),
  verifyProductInput("update"),
  update
);

router.delete(
  "/many",
  verifyPermission("d_product"),
  verifyEmptyBody,
  inputSanitizer("delete many"),
  verifyProductInput("delete many"),
  removeBulk
);

router.delete("/:productId", verifyPermission("d_product"), remove);

export default router;
