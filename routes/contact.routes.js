import express from "express";
import { verifyToken } from "../middlewares/authMiddleware.js";
import ContactController from "../controllers/contact.controller.js";

const router = express.Router();

router.get("/", verifyToken, ContactController.getContacts);
router.post("/", verifyToken, ContactController.createContact);
router.patch("/:id", verifyToken, ContactController.updateContact);
router.delete("/:id", verifyToken, ContactController.deleteContact);

export default router;
