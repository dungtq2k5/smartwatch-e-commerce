import express from "express";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyOsInput,
} from "../../utils/middlewares/product.middleware";
import {
  create,
  get,
  getAll,
  remove,
  update,
} from "../../controllers/product/os.controller";

const router = express.Router();

router.post(
  "/",
  verifyPermission("c_product_os"),
  verifyEmptyBody,
  inputSanitizer("os"),
  verifyOsInput("create"),
  create
);

router.get("/:id", get);

router.get("/", getAll);

router.patch(
  "/:id",
  verifyPermission("u_product_os"),
  verifyEmptyBody,
  inputSanitizer("os"),
  verifyOsInput("update"),
  update
);

router.delete("/:id", verifyPermission("d_product_os"), remove);

export default router;
