// Logic for forgot-password.html.
import { resetPassword } from "../auth.js";
import { getErrorMessage } from "../api.js";
import { isValidEmail } from "../validation.js";

const form = document.getElementById("forgot-password-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const email = form.email.value.trim();
  if (!isValidEmail(email)) {
    formError.hidden = false;
    formError.textContent = "Enter a valid email address.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    await resetPassword(email);
    formSuccess.hidden = false;
    formSuccess.textContent = "If an account exists for that email, a password reset link is on its way. Be sure to check your spam folder.";
    submitBtn.textContent = "Send reset link";
  } catch (err) {
    formError.hidden = false;
    formError.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Send reset link";
  }
});
