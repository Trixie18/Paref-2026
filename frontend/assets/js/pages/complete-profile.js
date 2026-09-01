// Logic for complete-profile.html - the recovery path for a Firebase/dev
// session that has no matching Users-sheet row (the row was deleted by
// hand, or the original POST /api/auth/register call never completed).
// guard.js's requireParent() sends people here instead of letting every
// protected page fail with a raw "No profile exists for this account
// yet" error and no way forward.
import { authReady, getIdToken, signOut } from "../auth.js";
import { getProfile, registerProfile, ApiError, getErrorMessage } from "../api.js";
import { validateNamePhone } from "../validation.js";

const loading = document.getElementById("loading");
const content = document.getElementById("content");
const form = document.getElementById("complete-profile-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const signOutLink = document.getElementById("sign-out-link");

const fieldIds = { name: "name", phone: "phone" };

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

signOutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await signOut();
  window.location.href = "/login.html";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const fields = { name: form.name.value, phone: form.phone.value };
  const errors = validateNamePhone(fields);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    await registerProfile({ name: fields.name.trim(), phone: fields.phone.trim() });
    window.location.href = "/dashboard.html";
  } catch (err) {
    // A profile that already exists (e.g. a retried submit, or it was
    // created in another tab) just means there's nothing left to do here.
    if (err instanceof ApiError && err.status === 409) {
      window.location.href = "/dashboard.html";
      return;
    }
    formError.hidden = false;
    formError.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = "Save and continue";
  }
});

(async () => {
  await authReady();
  const token = await getIdToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    await getProfile();
    // A profile already exists - nothing to complete, so don't show this
    // page at all.
    window.location.href = "/dashboard.html";
    return;
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) {
      // Some other failure (network, 500) - show it rather than silently
      // looping between pages.
      formError.hidden = false;
      formError.textContent = getErrorMessage(err);
    }
  }

  loading.hidden = true;
  content.hidden = false;
})();
