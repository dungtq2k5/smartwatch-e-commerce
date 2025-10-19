import express from "express";
import {
  authByGoogle,
  checkAuth,
  forgotPassword,
  login,
  logout,
  resetPassword,
  signup,
  validatePassword,
  verifyUser,
  refreshToken,
} from "../controllers/auth.controller";
import {
  verifyAuthentication,
  verifyJwtHasUserId,
  verifyReauthentication,
} from "../utils/middlewares/auth.middleware";
import { verifyEmptyBody } from "../utils/middlewares/general.middleware";
import {
  sanitizeUserInput,
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
  sanitizeUserInput,
  verifyUserInput("signup"),
  signup
);

router.post(
  "/login",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  sanitizeUserInput,
  verifyUserInput("login"),
  login
);

router.post("/logout", verifyAuthentication, logout);

router.post(
  "/verify-user",
  verifyJwtHasUserId,
  verifyEmptyBody,
  sanitizeUserInput,
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
  sanitizeUserInput,
  verifyUserInput("forgot password"),
  forgotPassword
);

router.post(
  "/reset-password/:token",
  authLimiter,
  verifyReauthentication,
  verifyEmptyBody,
  sanitizeUserInput,
  verifyUserInput("reset password"),
  resetPassword
);

router.post("/refresh-token", refreshToken);

router.get("/check-auth", verifyJwtHasUserId, checkAuth);

router.post(
  "/validate-password",
  verifyAuthentication,
  verifyEmptyBody,
  verifyUserInput("validate password"),
  validatePassword
);

export default router;
