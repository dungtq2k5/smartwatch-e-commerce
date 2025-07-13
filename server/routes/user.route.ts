import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyAddressInput,
  verifyCartInput,
  verifyUserInput,
} from "../utils/middlewares/user.middleware";
import * as userController from "../controllers/user/user.controller";
import * as cartController from "../controllers/user/cart.controller";
import * as addressController from "../controllers/user/address.controller";

const router = express.Router();

// --- ROUTES FOR THE AUTH BUYER (/me) ---

// -- ROUTES FOR PROFILE
router.get("/me", verifyPermission("r_usr"), userController.getSelf);

router.patch(
  "/me/contact-info",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update contact info"),
  userController.updateSelfContactInfo
);

router.patch(
  "/me",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update"),
  userController.updateSelfGeneralInfo
);

router.delete("/me", verifyPermission("d_usr"), userController.deleteSelf);

// -- ROUTES FOR CART
router.post(
  "/me/carts",
  verifyPermission("c_usr_cart"),
  verifyEmptyBody,
  verifyCartInput("create"),
  cartController.createSelf
);
router.get(
  "/me/carts/",
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

// -- ROUTES FOR ADDRESS
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

// --- ROUTES FOR ADMIN MANAGEMENT ---

// -- ROUTES FOR USER
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

// -- ROUTES FOR ADDRESS
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
