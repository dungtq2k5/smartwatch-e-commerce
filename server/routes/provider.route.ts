import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeProviderInput,
  verifyProviderInput,
} from "../utils/middlewares/provider.middleware";
import {
  create,
  get,
  remove,
  update,
} from "../controllers/provider.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderInput,
  verifyProviderInput("create"),
  create
);

router.get("/:providerId", verifyPermission("r_provider_inventory"), get);

router.patch(
  "/:providerId",
  verifyPermission("u_provider_inventory"),
  verifyEmptyBody,
  sanitizeProviderInput,
  verifyProviderInput("update"),
  update
);

router.delete("/:providerId", verifyPermission("d_provider_inventory"), remove);

export default router;
