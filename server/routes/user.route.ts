import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyAddressInput,
  verifyUserInput,
} from "../utils/middlewares/user.middleware";
import {
  updateSelfContactInfo,
  updateSelfGeneralInfo,
  updateGeneralInfo,
  updateEmail,
  updatePhoneNumber,
  deleteSelf,
  remove,
  create,
  get,
  getSelf,
  search,
  getSelfAddresses,
  getAddresses,
  updateAddress,
  removeAddress,
  createSelfAddress,
  createAddress,
} from "../controllers/user.controller";

const router = express.Router();

// --- ROUTES FOR THE AUTH BUYER (/ME) ---
// Create
router.post(
  "/me/addresses",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("create"),
  createSelfAddress
);

// Read
router.get("/me", verifyPermission("r_usr"), getSelf);
router.get("/me/addresses", verifyPermission("r_usr_addr"), getSelfAddresses);

// Update
router.patch(
  "/me/contact-info",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update contact info"),
  updateSelfContactInfo
);
router.patch(
  "/me",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update"),
  updateSelfGeneralInfo
);
router.patch(
  "/me/addresses/:id",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("update"),
  updateAddress
);

// Delete
router.delete("/me", verifyPermission("d_usr"), deleteSelf);
router.delete(
  "/me/addresses/:id",
  verifyPermission("d_usr_addr"),
  removeAddress
);

// --- ROUTES FOR ADMIN MANAGEMENT ---
// Create
router.post(
  "/",
  verifyPermission("c_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("create"),
  create
);
router.post(
  "/:id/addresses",
  verifyPermission("c_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("create"),
  createAddress
);

// Read
router.get("/:id", verifyPermission("r_usr"), get);
/*
  limit, offset,
  searchTerm,
  isEmailVerified, isPhoneNumberVerified,
  isLocked,
  sortBy, (createdAt, updatedAt, fullName, email, lastLogin, userBalanceCents)
  ...
*/
router.get("/", verifyPermission("r_usr"), search);
router.get("/:id/addresses", verifyPermission("r_usr_addr"), getAddresses);

// Update
router.patch(
  "/email/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update email"),
  updateEmail
);
router.patch(
  "/phone-number/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  verifyUserInput("update phone number"),
  updatePhoneNumber
);
router.patch(
  "/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  inputSanitizer("user"),
  verifyUserInput("update"),
  updateGeneralInfo
);
router.patch(
  "/addresses/:id",
  verifyPermission("u_usr_addr"),
  verifyEmptyBody,
  inputSanitizer("address"),
  verifyAddressInput("update"),
  updateAddress
);

// Delete
router.delete("/:id", verifyPermission("d_usr"), remove);
router.delete("/addresses/:id", verifyPermission("d_usr_addr"), removeAddress);

export default router;
