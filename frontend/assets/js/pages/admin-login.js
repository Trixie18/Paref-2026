// Logic for admin-login.html.
import { signIn, signOut, authReady, getIdToken } from "../auth.js";
import { getAdminProfile, ApiError, getErrorMessage } from "../api.js";

const form = document.getElementById("admin-login-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");

function redirectForRole(role) {
  window.location.href = role === "ADMIN" ? "/admin/dashboard.html" : "/admin/orders.html";
}

// If already signed in with a valid admin/staff account, skip straight to
// the right dashboard (mirrors the React app's useAdminSession redirect).
(async () => {
  await authReady();
  const token = await getIdToken();
  if (!token) return;
  try {
    const profile = await getAdminProfile();
    redirectForRole(profile.role);
  } catch {
    // Signed in but not an admin/staff account (or check failed) - stay
    // on this page and let the user try a different account.
  }
})();

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
    submitBtn.textContent = "Verifying access...";
    try {
      const profile = await getAdminProfile();
      redirectForRole(profile.role);
    } catch (err) {
      await signOut();
      formError.hidden = false;
      formError.textContent =
        err instanceof ApiError && err.status === 401
          ? "Your session could not be verified. Please try again."
          : "This account is not an administrator or staff member.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  } catch (err) {
    formError.hidden = false;
    formError.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Log In";
  }
});
