import express from "express";
import {
  authByGoogle,
  checkAuth,
  forgotPassword,
  login,
  loginAdmin,
  logout,
  resetPassword,
  signup,
  validatePassword,
  verifyUser,
  refreshToken,
  checkAdminAuth,
} from "../controllers/auth.controller";
import {
  verifyAuthentication,
  verifyJwtHasUserId,
  verifyReauthentication,
} from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  inputSanitizer,
  verifyUserInput,
} from "../utils/middlewares/user/user.middleware";
import rateLimit from "express-rate-limit";

const router = express.Router();

const isDev = process.env.NODE_ENV !== "production";

// Limit each IP to 100 requests per minute in development, 5 requests per 15 minutes in production
const authLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  skipSuccessfulRequests: true, // Skip rate limiting for successful requests
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post(
  "/signup",
  verifyReauthentication,
  verifyEmptyBody,
  inputSanitizer("signup"),
  verifyUserInput("signup"),
  signup
);

router.post(
  "/login",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  inputSanitizer("login"),
  verifyUserInput("login"),
  login
);

router.post(
  "/admin-login",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  inputSanitizer("admin login"),
  verifyUserInput("admin login"),
  loginAdmin
);

router.post("/logout", verifyAuthentication, logout);

router.post(
  "/verify-user",
  verifyJwtHasUserId,
  verifyEmptyBody,
  inputSanitizer("verify user"),
  verifyUserInput("verify user"),
  verifyUser
);

router.post(
  "/google",
  verifyReauthentication,
  verifyEmptyBody,
  verifyUserInput("auth by google"),
  authByGoogle
);

router.post(
  "/forgot-password",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  inputSanitizer("forgot password"),
  verifyUserInput("forgot password"),
  forgotPassword
);

router.post(
  "/reset-password/:token",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  inputSanitizer("reset password"),
  verifyUserInput("reset password"),
  resetPassword
);

router.post("/refresh-token", refreshToken);

router.get("/check-auth", verifyJwtHasUserId, checkAuth);
router.get("/check-admin-auth", verifyJwtHasUserId, checkAdminAuth);

router.post(
  "/validate-password",
  verifyAuthentication,
  verifyEmptyBody,
  verifyUserInput("validate password"),
  validatePassword
);

export default router;
