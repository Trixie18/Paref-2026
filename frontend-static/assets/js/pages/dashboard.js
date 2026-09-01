// Logic for dashboard.html.
import { requireParent } from "../guard.js";
import { getProfile, listPlayers, listOrders, getErrorMessage } from "../api.js";
import { readCart, getItemCount } from "../cart.js";

await requireParent();

const loading = document.getElementById("loading");
const content = document.getElementById("content");
const errorBanner = document.getElementById("error-banner");

try {
  const [profile, players, orders] = await Promise.all([getProfile(), listPlayers(), listOrders()]);
  document.getElementById("welcome-name").textContent = profile.name || "there";
  document.getElementById("player-count").textContent = String(players.length);
  document.getElementById("order-count").textContent = String(orders.length);
  document.getElementById("cart-count").textContent = String(getItemCount(readCart()));
} catch (err) {
  errorBanner.hidden = false;
  errorBanner.textContent = getErrorMessage(err);
} finally {
  loading.hidden = true;
  content.hidden = false;
}
