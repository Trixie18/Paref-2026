// Logic for login.html.
import { signIn } from "../auth.js";
import { getErrorMessage } from "../api.js";

const form = document.getElementById("login-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) {
    formError.hidden = false;
    formError.textContent = "Enter your email and password.";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    await signIn(email, password);
    window.location.href = "/dashboard.html";
  } catch (err) {
    formError.hidden = false;
    formError.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Log In";
  }
});
