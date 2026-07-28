import assert from "node:assert/strict";
import test from "node:test";
import ResponseHandler from "../utils/responseHandler.js";

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

test("sendErrorResponse supports shorthand status code argument", () => {
  const response = createMockResponse();

  ResponseHandler.sendErrorResponse(response, "Invalid input", 400);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "Invalid input");
});
