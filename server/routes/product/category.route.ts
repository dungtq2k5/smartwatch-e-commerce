import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyCategoryInput,
} from "../../utils/middlewares/product/category.middleware";
import {
  create,
  adminSearch,
  get,
  getAll,
  remove,
  removeBulk,
  update,
  adminGet,
} from "../../controllers/product/category.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_cat"),
  verifyEmptyBody,
  inputSanitizer("category"),
  verifyCategoryInput("create"),
  create,
);

router.get(
  "/admin",
  verifyPermission("r_product_cat"),
  inputSanitizer("admin search"),
  verifyCategoryInput("admin search"),
  adminSearch,
);

router.get("/:categoryId/admin", verifyPermission("r_product_cat"), adminGet);

router.get("/:categoryId", get);

router.get("/", getAll);

router.patch(
  "/:categoryId",
  verifyPermission("u_product_cat"),
  verifyEmptyBody,
  inputSanitizer("category"),
  verifyCategoryInput("update"),
  update,
);

router.delete(
  "/many",
  verifyPermission("d_product_cat"),
  verifyEmptyBody,
  inputSanitizer("delete many"),
  verifyCategoryInput("delete many"),
  removeBulk,
);

router.delete("/:categoryId", verifyPermission("d_product_cat"), remove);

export default router;
