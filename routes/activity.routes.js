import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import ContactController from "../controllers/contact.controller.js";

const router = express.Router();

router.get("/", verifyToken, ContactController.getActivityLogs);
router.get(
  "/contacts/:contactId",
  verifyToken,
  ContactController.getContactActivityLogs,
);

export default router;
