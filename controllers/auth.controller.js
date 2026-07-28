import User from "../models/user.js";
import Otp from "../models/otp.js";
import ResponseHandler from "../utils/responseHandler.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  generateOtp,
} from "../utils/authUtils.js";
import { sendMail } from "../utils/emailUtils.js";

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "All fields are required",
          400,
        );
      }

      if (password !== confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Passwords do not match",
          400,
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });

      if (existingUser) {
        if (existingUser.verified) {
          return ResponseHandler.sendErrorResponse(
            res,
            "User already exists",
            409,
          );
        }

        const nextName = name.trim();
        const nextPassword = await hashPassword(password);

        existingUser.name = nextName;
        existingUser.password = nextPassword;
        await existingUser.save();

        const activeOtp = await Otp.findOne({
          userId: existingUser._id,
          purpose: "EMAIL_VERIFY",
          expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 });

        let otp = activeOtp?.otp;

        if (!otp) {
          otp = generateOtp();

          await Otp.deleteMany({
            userId: existingUser._id,
            purpose: "EMAIL_VERIFY",
          });

          await Otp.create({
            userId: existingUser._id,
            otp,
            purpose: "EMAIL_VERIFY",
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          });
        }

        try {
          await sendMail("verifyAccountOtp", existingUser.email, { otp });
        } catch (mailError) {
          await Otp.deleteMany({
            userId: existingUser._id,
            purpose: "EMAIL_VERIFY",
          });

          return ResponseHandler.sendErrorResponse(
            res,
            `Could not send verification email: ${mailError.message}`,
            "Email delivery failed",
            500,
          );
        }

        return ResponseHandler.sendSuccessResponse(
          res,
          {
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            verified: existingUser.verified,
            role: existingUser.role,
          },
          "Signup details updated. Verification OTP sent. Please verify your account.",
          200,
        );
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        verified: false,
      });

      const otp = generateOtp();

      await Otp.create({
        userId: newUser._id,
        otp,
        purpose: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      try {
        await sendMail("verifyAccountOtp", newUser.email, { otp });
      } catch (mailError) {
        await Otp.deleteMany({
          userId: newUser._id,
          purpose: "EMAIL_VERIFY",
        });
        await User.findByIdAndDelete(newUser._id);

        return ResponseHandler.sendErrorResponse(
          res,
          `Could not send verification email: ${mailError.message}`,
          "Email delivery failed",
          500,
        );
      }

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          verified: newUser.verified,
          role: newUser.role,
        },
        "Registration successful! Verification OTP sent to your registered email.",
        201,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async isverify(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Email and OTP are required",
          400,
        );
      }

      const user = await User.findOne({ email });

      if (!user) {
        return ResponseHandler.sendErrorResponse(res, "User not found", 404);
      }

      if (user.verified) {
        return ResponseHandler.sendSuccessResponse(
          res,
          {
            id: user._id,
            name: user.name,
            email: user.email,
            verified: user.verified,
            role: user.role,
          },
          "User already verified try to login",
          200,
        );
      }

      const otpRecord = await Otp.findOne({
        userId: user._id,
        otp,
        purpose: "EMAIL_VERIFY",
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Invalid or expired OTP",
          400,
        );
      }

      user.verified = true;
      await user.save();

      await Otp.deleteMany({
        userId: user._id,
        purpose: "EMAIL_VERIFY",
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role,
        },
        "User verified successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Email and password are required",
          400,
        );
      }

      const user = await User.findOne({ email });

      if (!user) {
        return ResponseHandler.sendErrorResponse(
          res,
          "No account found with this email address. Please create a new account or try a different email.",
          401,
        );
      }

      const isMatch = await comparePassword(password, user.password);

      if (!isMatch) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Incorrect password. Try again or click Forgot Password to reset it.",
          401,
        );
      }

      if (!user.verified) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Please verify your account before login",
          403,
        );
      }

      const payload = {
        id: user._id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      user.refreshToken = refreshToken;
      await user.save();

      res.cookie("accessToken", accessToken, accessTokenCookieOptions);
      res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

      return ResponseHandler.sendSuccessResponse(
        res,
        {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role,
        },
        "Login successful",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async refreshAccessToken(req, res) {
    try {
      const token = req.cookies?.refreshToken;

      if (!token) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Refresh token missing",
          401,
        );
      }

      let decoded;

      try {
        decoded = verifyRefreshToken(token);
      } catch (err) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Invalid or expired refresh token",
          403,
        );
      }

      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== token) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Invalid refresh token",
          403,
        );
      }

      const payload = {
        id: user._id,
        email: user.email,
        role: user.role,
      };

      const newAccessToken = generateAccessToken(payload);

      res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Access token refreshed",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async logout(req, res) {
    try {
      const token = req.cookies?.refreshToken;

      if (token) {
        const user = await User.findOne({ refreshToken: token });

        if (user) {
          user.refreshToken = null;
          await user.save();
        }
      }

      res.clearCookie("accessToken", accessTokenCookieOptions);
      res.clearCookie("refreshToken", refreshTokenCookieOptions);

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Logged out successfully",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return ResponseHandler.sendErrorResponse(res, "Email is required", 400);
      }

      const user = await User.findOne({ email });

      if (!user) {
        return ResponseHandler.sendSuccessResponse(
          res,
          null,
          "If that email exists, an OTP has been sent",
          200,
        );
      }

      const otp = generateOtp();

      await Otp.deleteMany({
        userId: user._id,
        purpose: "RESET_PASSWORD",
      });

      await Otp.create({
        userId: user._id,
        otp,
        purpose: "RESET_PASSWORD",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendMail("resetPasswordOtp", user.email, { otp });

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "If that email exists, an OTP has been sent",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async resetPassword(req, res) {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;

      if (!email || !otp || !newPassword || !confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Email, OTP, new password and confirm password are required",
          400,
        );
      }

      if (newPassword !== confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Passwords do not match",
          400,
        );
      }

      const user = await User.findOne({ email });

      if (!user) {
        return ResponseHandler.sendErrorResponse(res, "User not found", 404);
      }

      const otpRecord = await Otp.findOne({
        userId: user._id,
        otp,
        purpose: "RESET_PASSWORD",
        expiresAt: { $gt: new Date() },
      });

      if (!otpRecord) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Invalid or expired OTP",
          400,
        );
      }

      user.password = await hashPassword(newPassword);
      user.refreshToken = null;

      await user.save();

      await Otp.deleteMany({
        userId: user._id,
        purpose: "RESET_PASSWORD",
      });

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Password reset successful",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Current password, new password and confirm password are required",
          400,
        );
      }

      if (newPassword !== confirmPassword) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Passwords do not match",
          400,
        );
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return ResponseHandler.sendErrorResponse(res, "User not found", 404);
      }

      const isMatch = await comparePassword(currentPassword, user.password);

      if (!isMatch) {
        return ResponseHandler.sendErrorResponse(
          res,
          "Current password is incorrect",
          401,
        );
      }

      user.password = await hashPassword(newPassword);
      user.refreshToken = null;
      await user.save();

      res.clearCookie("accessToken", accessTokenCookieOptions);
      res.clearCookie("refreshToken", refreshTokenCookieOptions);

      return ResponseHandler.sendSuccessResponse(
        res,
        null,
        "Password changed successfully. Please login again",
        200,
      );
    } catch (error) {
      return ResponseHandler.sendErrorResponse(res, error.message, 500);
    }
  }
}

export default AuthController;
