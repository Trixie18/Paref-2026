export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

export interface RegisterFormFields {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export type RegisterFormErrors = Partial<Record<keyof RegisterFormFields, string>>;

export function validateRegisterForm(fields: RegisterFormFields): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!fields.name.trim()) errors.name = "Full name is required.";

  if (!fields.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(fields.email)) errors.email = "Enter a valid email address.";

  if (!fields.phone.trim()) errors.phone = "Mobile number is required.";
  else if (!isValidPhone(fields.phone)) errors.phone = "Enter a valid mobile number.";

  if (!fields.password) errors.password = "Password is required.";
  else if (fields.password.length < 6) errors.password = "Password must be at least 6 characters.";

  if (!fields.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (fields.password !== fields.confirmPassword) errors.confirmPassword = "Passwords do not match.";

  return errors;
}
