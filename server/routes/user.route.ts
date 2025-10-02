import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyAddressInput,
  verifyCartInput,
  verifyPaymentMethodInput,
  verifyUserInput,
} from "../utils/middlewares/user.middleware";
import * as userController from "../controllers/user/user.controller";
import * as cartController from "../controllers/user/cart.controller";
import * as addressController from "../controllers/user/address.controller";
import * as paymentMethodController from "../controllers/user/paymentMethod.controller";
import { createSetupIntent } from "../controllers/stripe.controller";
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

// -- routes for profile
router.get("/me", verifyPermission("r_usr"), userController.getSelf);

router.patch(
  "/me/contact-info",
  updateSelfContactInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update contact info"),
  userController.updateSelfContactInfo
);

router.patch(
  "/me",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update"),
  userController.updateSelfGeneralInfo
);

router.patch(
  "/me/password",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("update password"),
  userController.updateSelfPassword
);

router.patch(
  "/me/set-password",
  updateSelfGeneralInfoLimiter,
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("set password"),
  userController.setSelfPassword
);

router.delete("/me", verifyPermission("d_usr"), userController.deleteSelf);

// -- routes for cart
router.post(
  "/me/carts/many",
  verifyPermission("c_usr_cart"),
  verifyEmptyBody,
  inputSanitizer("create many cart"),
  verifyCartInput("create many"),
  cartController.createBulkSelf
);
router.post(
  "/me/carts",
  verifyPermission("c_usr_cart"),
  verifyEmptyBody,
  verifyCartInput("create"),
  cartController.createSelf
);
router.get(
  "/me/carts",
  verifyPermission("r_usr_cart"),
  cartController.getSelfAll
);
router.patch(
  "/me/carts/:variationId",
  verifyPermission("u_usr_cart"),
  verifyEmptyBody,
  verifyCartInput("update"),
  cartController.updateSelf
);
router.delete(
  "/me/carts/:variationId",
  verifyPermission("d_usr_cart"),
  cartController.removeSelf
);

// -- routes for address
router.post(
  "/me/addresses",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("create"),
  addressController.createSelf
);

router.get(
  "/me/addresses",
  verifyPermission("r_usr_addr"),
  addressController.getSelfAll
);

router.get(
  "/me/addresses/default",
  verifyPermission("r_usr_addr"),
  addressController.getSelfDefault
);

router.get(
  "/me/addresses/:id",
  verifyPermission("r_usr_addr"),
  addressController.getSelf
);

router.patch(
  "/me/addresses/:id",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("update"),
  addressController.update
);

router.delete(
  "/me/addresses/:id",
  verifyPermission("d_usr_addr"),
  addressController.remove
);

// -- routes for payment methods
router.post(
  "/me/payment-methods/setup-intent",
  verifyPermission("c_usr_paym"),
  createSetupIntent
);

router.post(
  "/me/payment-methods",
  verifyPermission("r_usr_paym"),
  verifyEmptyBody,
  verifyPaymentMethodInput("create"),
  paymentMethodController.attachSelfPaymentMethod
);

router.get(
  "/me/payment-methods",
  verifyPermission("r_usr_paym"),
  paymentMethodController.getSelfAll
);

router.patch(
  "/me/payment-methods/:id/set-default",
  verifyPermission("u_usr_paym"),
  paymentMethodController.setSelfAsDefault
);

router.delete(
  "/me/payment-methods/:id",
  verifyPermission("d_usr_paym"),
  paymentMethodController.removeSelf
);

// --- ROUTES FOR ADMIN MANAGEMENT ---

// -- routes for user
router.post(
  "/",
  verifyPermission("c_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("create"),
  userController.create
);

router.get("/:id", verifyPermission("r_usr"), userController.get);

/*
  limit, offset,
  searchTerm,
  isEmailVerified, isPhoneNumberVerified,
  isLocked,
  sortBy: createdAt, updatedAt, fullName, email, lastLogin, userBalanceCents
  ...
*/
router.get("/", verifyPermission("r_usr"), userController.search);

router.patch(
  "/email/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update email"),
  userController.updateEmail
);

router.patch(
  "/phone-number/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("update phone number"),
  userController.updatePhoneNumber
);

router.patch(
  "/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update"),
  userController.updateGeneralInfo
);

router.delete("/:id", verifyPermission("d_usr"), userController.remove);

// -- routes for address
router.post(
  "/:id/addresses",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("create"),
  addressController.create
);

router.get(
  "/:id/addresses",
  verifyPermission("r_usr_addr"),
  addressController.getAll
);

router.patch(
  "/:userId/addresses/:id",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("update"),
  addressController.update
);

router.delete(
  "/:userId/addresses/:id",
  verifyPermission("d_usr_addr"),
  addressController.remove
);

export default router;
