import Contact from "../models/contact.js";
import ActivityLog from "../models/activityLog.js";
import User from "../models/user.js";
import ResponseHandler from "../utils/responseHandler.js";
import {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../utils/authUtils.js";

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  verified: user.verified,
  role: user.role,
});

class UserController {
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return ResponseHandler.sendErrorResponse(res, "User not found", 404);
      }

      return ResponseHandler.sendSuccessResponse(
        res,
        toSafeUser(user),
        "Profile fetched successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, email } = req.body;

      if (email) {
        const existingUser = await User.findOne({
          email: email.toLowerCase(),
          _id: { $ne: req.user.id },
        });

        if (existingUser) {
          return ResponseHandler.sendErrorResponse(
            res,
            "This email is already in use",
            409,
          );
        }
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;

      const user = await User.findByIdAndUpdate(req.user.id, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return ResponseHandler.sendErrorResponse(res, "User not found", 404);
      }

      return ResponseHandler.sendSuccessResponse(
        res,
        toSafeUser(user),
        "Profile updated successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async deleteAccount(req, res) {
    try {
      await Contact.deleteMany({ userId: req.user.id });
      await ActivityLog.deleteMany({ userId: req.user.id });
      await User.findByIdAndDelete(req.user.id);

      res.clearCookie("accessToken", accessTokenCookieOptions);
      res.clearCookie("refreshToken", refreshTokenCookieOptions);

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Account deleted successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }
}

export default UserController;
