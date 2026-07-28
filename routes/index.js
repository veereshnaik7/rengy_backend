import express from "express";
import ResponseHandler from "../utils/responseHandler.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import contactRoutes from "./contact.routes.js";
import activityRoutes from "./activity.routes.js";
const router = express.Router();

router.get("/", (req, res) => {
  return ResponseHandler.sendSuccessResponse(
    res,
    null,
    "Mini CRM Main router API",
    200,
  );
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/contacts", contactRoutes);
router.use("/activity-logs", activityRoutes);

export default router;
