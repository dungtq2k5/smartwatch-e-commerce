import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import { verifyVariationInstanceInput } from "../../utils/middlewares/product.middleware";
import {
  create,
  get,
  update,
} from "../../controllers/product/variationInstance.controller";

const router = express.Router();

// Some routes in product.route.ts

router.get("/:instanceId", verifyPermission("r_variation_instance"), get);

router.patch(
  "/:instanceId",
  verifyPermission("u_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("update"),
  update
);

export default router;
