import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPhone, validateRegisterForm } from "./validation";

describe("isValidEmail", () => {
  it("accepts a well-formed email", () => {
    expect(isValidEmail("parent@example.com")).toBe(true);
  });

  it("rejects a string with no @ or domain", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts a number with at least 7 digits, ignoring formatting", () => {
    expect(isValidPhone("0917 123 4567")).toBe(true);
  });

  it("rejects a too-short number", () => {
    expect(isValidPhone("12345")).toBe(false);
  });
});

describe("validateRegisterForm", () => {
  const validFields = {
    name: "Maria Dela Cruz",
    email: "maria@example.com",
    phone: "09171234567",
    password: "hunter22",
    confirmPassword: "hunter22",
  };

  it("returns no errors for a fully valid form", () => {
    expect(validateRegisterForm(validFields)).toEqual({});
  });

  it("flags every required field as missing when the form is empty", () => {
    const errors = validateRegisterForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });

  it("flags an invalid email format", () => {
    const errors = validateRegisterForm({ ...validFields, email: "not-an-email" });
    expect(errors.email).toBe("Enter a valid email address.");
  });

  it("flags mismatched passwords", () => {
    const errors = validateRegisterForm({ ...validFields, confirmPassword: "somethingelse" });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
    // The rest of the form was valid, so nothing else should be flagged.
    expect(errors.name).toBeUndefined();
    expect(errors.email).toBeUndefined();
  });

  it("flags a password that is too short", () => {
    const errors = validateRegisterForm({ ...validFields, password: "abc", confirmPassword: "abc" });
    expect(errors.password).toBe("Password must be at least 6 characters.");
  });
});
