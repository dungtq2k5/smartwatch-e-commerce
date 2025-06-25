import express from "express";
import { verifyPermission } from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeUserInput,
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
} from "../controllers/user.controller";

const router = express.Router();

// --- Routes for the Authenticated User (/me) ---
// Read
router.get("/me", verifyPermission("r_usr"), getSelf);

// Update
router.patch(
  "/me/contact-info",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  sanitizeUserInput,
  verifyUserInput("update contact info"),
  updateSelfContactInfo
);
router.patch(
  "/me",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  sanitizeUserInput,
  verifyUserInput("update"),
  updateSelfGeneralInfo
);

// Delete
router.delete("/me", verifyPermission("d_usr"), deleteSelf);

// --- Routes for Admin Management ---
// Create
router.post(
  "/",
  verifyPermission("c_usr"),
  verifyEmptyBody,
  sanitizeUserInput,
  verifyUserInput("create"),
  create
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

// Update
router.patch(
  "/email/:id",
  verifyPermission("u_usr"),
  verifyEmptyBody,
  sanitizeUserInput,
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
  sanitizeUserInput,
  verifyUserInput("update"),
  updateGeneralInfo
);

// Delete
router.delete("/:id", verifyPermission("d_usr"), remove);

export default router;
