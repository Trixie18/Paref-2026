// Logic for players.html.
import { requireParent } from "../guard.js";
import { listPlayers, getErrorMessage } from "../api.js";

await requireParent();

const loading = document.getElementById("loading");
const errorBanner = document.getElementById("error-banner");
const emptyState = document.getElementById("empty-state");
const list = document.getElementById("player-list");

function chevronSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="text-muted shrink-0"><path d="m9 5.5 7 6.5-7 6.5" /></svg>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

try {
  const players = await listPlayers();
  loading.hidden = true;

  if (players.length === 0) {
    emptyState.hidden = false;
  } else {
    list.hidden = false;
    list.innerHTML = players
      .map(
        (p) => `
      <li>
        <a href="/player-form.html?id=${encodeURIComponent(p.player_id)}" class="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-background">
          <div>
            <p class="font-medium text-foreground">${escapeHtml(p.player_name)}</p>
            <p class="text-sm text-muted">${escapeHtml(p.age_group)} ${escapeHtml(p.team)} &middot; Jersey #${escapeHtml(p.jersey_number)}</p>
          </div>
          ${chevronSvg()}
        </a>
      </li>`
      )
      .join("");
  }
} catch (err) {
  loading.hidden = true;
  errorBanner.hidden = false;
  errorBanner.textContent = getErrorMessage(err);
}
