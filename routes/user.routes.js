import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import UserController from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", verifyToken, UserController.getProfile);
router.patch("/update", verifyToken, UserController.updateProfile);
router.delete("/delete", verifyToken, UserController.deleteAccount);

export default router;
