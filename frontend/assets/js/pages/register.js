// Logic for register.html.
import { signUp, getIdToken } from "../auth.js";
import { registerProfile, ApiError, getErrorMessage } from "../api.js";
import { validateRegisterForm } from "../validation.js";

const form = document.getElementById("register-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

const fieldIds = {
  name: "name",
  email: "email",
  phone: "phone",
  password: "password",
  confirmPassword: "confirm-password",
};

function clearErrors() {
  formError.hidden = true;
  formError.textContent = "";
  for (const key of Object.keys(fieldIds)) {
    const el = document.getElementById(`${fieldIds[key]}-error`);
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    document.getElementById(fieldIds[key]).classList.remove("has-error");
  }
}

function showFieldErrors(errors) {
  for (const [key, message] of Object.entries(errors)) {
    const errEl = document.getElementById(`${fieldIds[key]}-error`);
    const inputEl = document.getElementById(fieldIds[key]);
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = message;
    }
    if (inputEl) inputEl.classList.add("has-error");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const fields = {
    name: form.name.value,
    email: form.email.value,
    phone: form.phone.value,
    password: form.password.value,
    confirmPassword: form.confirmPassword.value,
  };

  const errors = validateRegisterForm(fields);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    await signUp(fields.email.trim(), fields.password);
    const token = await getIdToken();
    if (!token) throw new Error("Sign-up succeeded but no session was created. Please try logging in.");

    try {
      await registerProfile({ name: fields.name.trim(), phone: fields.phone.trim() });
    } catch (err) {
      // A profile that already exists for this account (e.g. a retried
      // submit) is not a failure from the user's point of view.
      if (!(err instanceof ApiError && err.status === 409)) throw err;
    }

    window.location.href = "/dashboard.html";
  } catch (err) {
    formError.hidden = false;
    formError.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Register";
  }
});
