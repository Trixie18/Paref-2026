// Logic for profile.html.
import { requireParent } from "../guard.js";
import { getProfile, updateProfile, getErrorMessage } from "../api.js";

await requireParent();

const loading = document.getElementById("loading");
const form = document.getElementById("profile-form");
const errorBanner = document.getElementById("error-banner");
const savedMessage = document.getElementById("saved-message");
const submitBtn = document.getElementById("submit-btn");

try {
  const profile = await getProfile();
  form.email.value = profile.email;
  form.name.value = profile.name;
  form.phone.value = profile.phone;
  loading.hidden = true;
  form.hidden = false;
} catch (err) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = getErrorMessage(err);
  form.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBanner.hidden = true;
  savedMessage.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    await updateProfile({ name: form.name.value.trim(), phone: form.phone.value.trim() });
    savedMessage.hidden = false;
  } catch (err) {
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Changes";
  }
});
