import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import { inputSanitizer, verifyVariationInstanceInput } from "../../utils/middlewares/product/instance.middleware";
import {
  adminGetDetails,
  adminSearch,
  create,
  get,
  searchByVariation,
  update,
} from "../../controllers/product/variationInstance.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("create"),
  create
);

router.get(
  "/admin",
  verifyPermission("r_variation_instance"),
  inputSanitizer("admin search"),
  verifyVariationInstanceInput("admin search"),
  adminSearch
);

/**
 * Lightweight SKU lookup scoped to a single variation.
 * Used by the order fulfillment UI for live SKU search per variation row.
 * No heavy aggregation — just a lean find with index hit.
 */
router.get(
  "/search-by-variation",
  verifyPermission("r_variation_instance"),
  inputSanitizer("search by variation"),
  verifyVariationInstanceInput("search by variation"),
  searchByVariation
);

router.get(
  "/:instanceId/details/admin",
  verifyPermission("r_variation_instance"),
  adminGetDetails
);

router.get("/:instanceId", verifyPermission("r_variation_instance"), get);

router.patch(
  "/:instanceId",
  verifyPermission("u_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("update"),
  update
);

export default router;
