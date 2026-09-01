// Logic for player-form.html. Add mode with no ?id=, edit mode with
// ?id=PLY-xxxxxx (mirrors players/new and players/[id] in the React app).
import { requireParent } from "../guard.js";
import { createPlayer, getPlayer, updatePlayer, getErrorMessage } from "../api.js";

await requireParent();

const playerId = new URLSearchParams(window.location.search).get("id");
const isEdit = Boolean(playerId);

const pageTitle = document.getElementById("page-title");
const loading = document.getElementById("loading");
const form = document.getElementById("player-form");
const submitBtn = document.getElementById("submit-btn");
const errorBanner = document.getElementById("error-banner");
const savedMessage = document.getElementById("saved-message");

if (isEdit) {
  pageTitle.textContent = "Edit Player";
  try {
    const player = await getPlayer(playerId);
    form.playerName.value = player.player_name;
    form.team.value = player.team;
    form.ageGroup.value = player.age_group;
    form.jerseyNumber.value = player.jersey_number;
  } catch (err) {
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}

loading.hidden = true;
form.hidden = false;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBanner.hidden = true;
  savedMessage.hidden = true;

  const playerName = form.playerName.value.trim();
  if (!playerName) {
    errorBanner.hidden = false;
    errorBanner.textContent = "Player name is required.";
    return;
  }

  const payload = {
    player_name: playerName,
    team: form.team.value.trim(),
    age_group: form.ageGroup.value.trim(),
    jersey_number: form.jerseyNumber.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    if (isEdit) {
      await updatePlayer(playerId, payload);
      savedMessage.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Save Changes";
    } else {
      await createPlayer(payload);
      window.location.href = "/players.html";
    }
  } catch (err) {
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? "Save Changes" : "Save Player";
  }
});

if (isEdit) submitBtn.textContent = "Save Changes";
