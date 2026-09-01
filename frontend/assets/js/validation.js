// Pure validation helpers - no DOM access, so these are directly unit
// testable with Node's built-in test runner (see tests/validation.test.js).
// Mirrors frontend/lib/validation.ts.

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 7;
}

/**
 * Validates the register form fields object:
 *   { name, email, phone, password, confirmPassword }
 * Returns an object with only the fields that have errors, e.g.
 *   { email: "Enter a valid email address." }
 * An empty object means the form is valid.
 */
export function validateRegisterForm(fields) {
  const errors = {};

  if (!fields.name || !fields.name.trim()) errors.name = "Full name is required.";

  if (!fields.email || !fields.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(fields.email)) errors.email = "Enter a valid email address.";

  if (!fields.phone || !fields.phone.trim()) errors.phone = "Mobile number is required.";
  else if (!isValidPhone(fields.phone)) errors.phone = "Enter a valid mobile number.";

  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length < 6) errors.password = "Password must be at least 6 characters.";

  if (!fields.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  return errors;
}

/**
 * Validates just { name, phone } - used by complete-profile.html, where
 * the account is already authenticated so email/password aren't collected.
 */
export function validateNamePhone(fields) {
  const errors = {};

  if (!fields.name || !fields.name.trim()) errors.name = "Full name is required.";

  if (!fields.phone || !fields.phone.trim()) errors.phone = "Mobile number is required.";
  else if (!isValidPhone(fields.phone)) errors.phone = "Enter a valid mobile number.";

  return errors;
}
