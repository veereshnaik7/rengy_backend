import express from "express";
import ResponseHandler from "../utils/responseHandler.js";
import AuthController from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { loginRateLimiter } from "../middlewares/loginRateLimiter.js";

const router = express.Router();

router.get("/", (req, res) => {
  return ResponseHandler.sendSuccessResponse(
    res,
    null,
    "Mini CRM Auth router API",
    200
  );
});

router.post("/register", AuthController.register);
router.post("/isverify", AuthController.isverify);
router.post("/login", loginRateLimiter, AuthController.login);
router.post("/refresh-token", AuthController.refreshAccessToken);
router.post("/logout", verifyToken, AuthController.logout);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.post("/change-password", verifyToken, AuthController.changePassword);

// Example protected route to test the access token
router.get("/me", verifyToken, (req, res) => {
  return ResponseHandler.sendSuccessResponse(res, req.user, "Authenticated user", 200);
});

export default router;
