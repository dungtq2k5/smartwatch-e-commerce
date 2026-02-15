import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer as sanitizeProviderInput,
  verifyProviderInput,
} from "../../utils/middlewares/provider/provider.middleware";
import {
  create,
  get,
  getAll,
  getDetails,
  remove,
  removeBulk,
  search,
  update,
} from "../../controllers/inventory/provider.controller";
import * as providerAddressController from "../../controllers/inventory/providerAddress.controller";
import {
  sanitizeProviderAddressInput,
  verifyProviderAddressInput,
} from "../../utils/middlewares/provider/providerAddress.middleware";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderInput("create"),
  verifyProviderInput("create"),
  create,
);

router.get(
  "/",
  verifyPermission("r_provider_inventory"),
  sanitizeProviderInput("search"),
  verifyProviderInput("search"),
  search,
);

router.get("/all", verifyPermission("r_provider_inventory"), getAll);

router.get(
  "/:providerId/details",
  verifyPermission("r_provider_inventory"),
  getDetails,
);

router.get("/:providerId", verifyPermission("r_provider_inventory"), get);

router.patch(
  "/:providerId",
  verifyPermission("u_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderInput("update"),
  verifyProviderInput("update"),
  update,
);

router.delete(
  "/many",
  verifyPermission("d_provider_inventory"),
  sanitizeProviderInput("delete many"),
  verifyProviderInput("delete many"),
  removeBulk,
);

router.delete("/:providerId", verifyPermission("d_provider_inventory"), remove);

// -- routes for provider address
router.post(
  "/:providerId/addresses",
  verifyPermission("c_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderAddressInput,
  verifyProviderAddressInput("create"),
  providerAddressController.create,
);

router.get(
  "/:providerId/addresses/:addressId",
  verifyPermission("r_provider_inventory"),
  providerAddressController.get,
);

router.patch(
  "/:providerId/addresses/:addressId",
  verifyPermission("u_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderAddressInput,
  verifyProviderAddressInput("update"),
  providerAddressController.update,
);

router.delete(
  "/:providerId/addresses/:addressId",
  verifyPermission("d_provider_inventory"),
  providerAddressController.remove,
);

export default router;
