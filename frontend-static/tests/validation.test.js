import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, isValidPhone, validateRegisterForm } from "../assets/js/validation.js";

test("isValidEmail accepts well-formed addresses", () => {
  assert.equal(isValidEmail("maria@example.test"), true);
  assert.equal(isValidEmail("  maria@example.test  "), true);
});

test("isValidEmail rejects malformed addresses", () => {
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("missing@domain"), false);
  assert.equal(isValidEmail("@nodomain.com"), false);
  assert.equal(isValidEmail(""), false);
});

test("isValidPhone accepts numbers with at least 7 digits, ignoring formatting", () => {
  assert.equal(isValidPhone("09171234567"), true);
  assert.equal(isValidPhone("+63 917 123 4567"), true);
  assert.equal(isValidPhone("(917) 123-4567"), true);
});

test("isValidPhone rejects short numbers", () => {
  assert.equal(isValidPhone("12345"), false);
  assert.equal(isValidPhone(""), false);
});

test("validateRegisterForm returns no errors for a fully valid form", () => {
  const errors = validateRegisterForm({
    name: "Maria Dela Cruz",
    email: "maria@example.test",
    phone: "09171234567",
    password: "secret1",
    confirmPassword: "secret1",
  });
  assert.deepEqual(errors, {});
});

test("validateRegisterForm flags each missing/invalid field independently", () => {
  const errors = validateRegisterForm({
    name: "",
    email: "not-an-email",
    phone: "123",
    password: "abc",
    confirmPassword: "xyz",
  });
  assert.equal(errors.name, "Full name is required.");
  assert.equal(errors.email, "Enter a valid email address.");
  assert.equal(errors.phone, "Enter a valid mobile number.");
  assert.equal(errors.password, "Password must be at least 6 characters.");
  assert.equal(errors.confirmPassword, "Passwords do not match.");
});

test("validateRegisterForm requires confirmPassword to match password exactly", () => {
  const errors = validateRegisterForm({
    name: "Jose Santos",
    email: "jose@example.test",
    phone: "09171234567",
    password: "correct-password",
    confirmPassword: "",
  });
  assert.equal(errors.confirmPassword, "Confirm your password.");
});
