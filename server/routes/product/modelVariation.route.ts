import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyVariationInput,
} from "../../utils/middlewares/product/variation.middleware";
import {
  create,
  adminSearch,
  get,
  update,
  remove,
  removeBulk,
} from "../../controllers/product/modelVariation.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyVariationInput("create"),
  create
);

router.get(
  "/admin",
  verifyPermission("r_model_variation"),
  inputSanitizer("admin search"),
  verifyVariationInput("admin search"),
  adminSearch
);

router.get("/:variationId", get);

router.patch(
  "/:variationId",
  verifyPermission("u_model_variation"),
  verifyEmptyBody,
  inputSanitizer("variation"),
  verifyVariationInput("update"),
  update
);

router.delete(
  "/many",
  verifyPermission("d_model_variation"),
  verifyEmptyBody,
  inputSanitizer("delete bulk"),
  removeBulk
);

router.delete("/:variationId", verifyPermission("d_model_variation"), remove);

export default router;
