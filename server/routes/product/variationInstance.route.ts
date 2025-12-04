import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import { verifyVariationInstanceInput } from "../../utils/middlewares/product/instance.middleware";
import {
  create,
  get,
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

router.get("/:instanceId", verifyPermission("r_variation_instance"), get);

router.patch(
  "/:instanceId",
  verifyPermission("u_variation_instance"),
  verifyEmptyBody,
  verifyVariationInstanceInput("update"),
  update
);

export default router;
