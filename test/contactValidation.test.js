import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContactInput } from "../utils/contactValidation.js";

test("accepts valid contact data and normalizes email", () => {
  const { data, errors } = normalizeContactInput({
    name: "Asha Rao",
    email: "ASHA@Example.COM",
    phone: "+91 98765 43210",
    company: "Jaimax",
    status: "Lead",
    notes: "Interested in the starter plan",
  });

  assert.deepEqual(errors, []);
  assert.equal(data.email, "asha@example.com");
});

test("rejects invalid contact status and email", () => {
  const { errors } = normalizeContactInput({
    name: "A",
    email: "bad-email",
    phone: "123",
    company: "",
    status: "Cold",
  });

  assert.ok(errors.length >= 4);
  assert.ok(errors.some((error) => error.includes("Status")));
});
