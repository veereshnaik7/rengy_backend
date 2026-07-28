class ResponseHandler {
  static sendSuccessResponse(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }
  static sendErrorResponse(res, error, message = "Error", statusCode = 500) {
    if (typeof message === "number") {
      statusCode = message;
      message = "Error";
    }

    return res.status(statusCode).json({
      success: false,
      message,
      error,
    });
  }
}

export default ResponseHandler;
