import ResponseHandler from "../utils/responseHandler.js";
import { verifyAccessToken } from "../utils/authUtils.js";

export function verifyToken(req, res, next) {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return ResponseHandler.sendErrorResponse(
        res,
        "Access token missing",
        401,
      );
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    return ResponseHandler.sendErrorResponse(
      res,
      "Invalid or expired access token",
      401,
    );
  }
}
