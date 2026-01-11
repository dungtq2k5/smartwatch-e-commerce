import express from "express";
import multer from "multer";
import { verifyPermission } from "../../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  parseExcelToJson,
  verifyGrnInput,
} from "../../utils/middlewares/grn.middleware";
import { GRN_FILE_IMPORT_MAX_SIZE } from "../../../common/configs.common";
import { create, search } from "../../controllers/grn/grn.controller";

const router = express.Router();

// Config multer to store file in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GRN_FILE_IMPORT_MAX_SIZE },
});

router.post(
  "/",
  verifyPermission("c_grn"),
  // Multer must run first to parse FormData (populates req.body and req.file)
  upload.single("file"), // "file" here must match formData.append("file", ...) on client side
  verifyEmptyBody,
  parseExcelToJson,
  inputSanitizer("create"),
  verifyGrnInput("create"),
  create
);

router.get(
  "/",
  verifyPermission("r_grn"),
  inputSanitizer("search"),
  verifyGrnInput("search"),
  search
);

export default router;
