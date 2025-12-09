import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyModelInput,
} from "../../utils/middlewares/product/model.middleware";
import {
  create,
  adminGetDetails,
  get,
  update,
  remove,
  adminSearch,
  removeBulk,
  adminGet,
} from "../../controllers/product/productModel.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyModelInput("create"),
  create
);

router.get(
  "/admin",
  verifyPermission("r_product_model"),
  inputSanitizer("admin model search"),
  verifyModelInput("admin search"),
  adminSearch,
);

router.get(
  "/:modelId/details/admin",
  verifyPermission("r_product_model"),
  inputSanitizer("admin model details"),
  verifyModelInput("admin details"),
  adminGetDetails
);

router.get(
  "/:modelId/admin",
  verifyPermission("r_product_model"),
  adminGet
);

router.get("/:modelId", get);

router.patch(
  "/:modelId",
  verifyPermission("u_product_model"),
  verifyEmptyBody,
  inputSanitizer("model"),
  verifyModelInput("update"),
  update
);

router.delete(
  "/many",
  verifyPermission("d_product_model"),
  verifyEmptyBody,
  inputSanitizer("delete many"),
  verifyModelInput("delete many"),
  removeBulk
);

router.delete("/:modelId", verifyPermission("d_product_model"), remove);

export default router;
