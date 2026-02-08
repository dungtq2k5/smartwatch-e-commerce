import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyUserInput,
} from "../utils/middlewares/user/user.middleware";
import {
  sanitizeAddressInput,
  verifyAddressInput,
} from "../utils/middlewares/user/address.middleware";
import * as userController from "../controllers/user/user.controller";
import * as addressController from "../controllers/user/address.controller";
import rateLimit from "express-rate-limit";

const router = express.Router();

const isDev = process.env.NODE_ENV !== "production";

const updateSelfGeneralInfoLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 5 : 10,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const updateSelfContactInfoLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- ROUTES FOR THE AUTH BUYER (/me) ---
router.get("/me", verifyPermission("r_usr"), userController.getSelf);

router.patch(
  "/me/contact-info",
  updateSelfContactInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("update contact-info"),
  verifyUserInput("update contact info"),
  userController.updateSelfContactInfo,
);

router.patch(
  "/me",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("update general-info"),
  verifyUserInput("update"),
  userController.updateSelfGeneralInfo,
);

router.patch(
  "/me/password",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("update password"),
  userController.updateSelfPassword,
);

router.patch(
  "/me/set-password",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("set password"),
  userController.setSelfPassword,
);

router.delete("/me", verifyPermission("d_usr"), userController.deleteSelf);

// -- ROUTES FOR ADMIN ONLY ---
router.post(
  "/",
  verifyPermission("c_usr"),
  verifyEmptyBody,
  inputSanitizer("create user"),
  verifyUserInput("create"),
  userController.create,
);

router.get(
  "/",
  verifyPermission("r_usr"),
  inputSanitizer("user search"),
  verifyUserInput("search"),
  userController.search,
);

router.get(
  "/sys-user-id",
  verifyPermission("r_usr"),
  userController.getSystemUserId,
);

router.get(
  "/:userId/details",
  verifyPermission("r_usr"),
  userController.getDetails,
);

router.get("/:userId", verifyPermission("r_usr"), userController.get);

router.patch(
  "/:userId/email",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("update email"),
  verifyUserInput("update email"),
  userController.updateEmail,
);

router.patch(
  "/:userId/phone-number",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("update phone number"),
  userController.updatePhoneNumber,
);

router.patch(
  "/:userId",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("update general-info"),
  verifyUserInput("update"),
  userController.updateGeneralInfo,
);

router.delete("/:userId", verifyPermission("d_usr"), userController.remove);

router.delete(
  "/many",
  verifyPermission("d_usr"),
  inputSanitizer("delete many"),
  verifyUserInput("delete many"),
  userController.removeBulk,
);

// -- routes for address
router.post(
  "/:userId/addresses",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  sanitizeAddressInput,
  verifyAddressInput("create"),
  addressController.create,
);

router.get(
  "/:userId/addresses",
  verifyPermission("r_usr_addr"),
  addressController.getAllByUserId,
);

router.patch(
  "/:userId/addresses/:addressId",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  sanitizeAddressInput,
  verifyAddressInput("update"),
  addressController.update,
);

router.delete(
  "/:userId/addresses/:addressId",
  verifyPermission("d_usr_addr"),
  addressController.remove,
);

export default router;
