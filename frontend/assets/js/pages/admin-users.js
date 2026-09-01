// Logic for admin/users.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { listUsers, getErrorMessage } from "../api.js";
import { wireLiveSearch } from "../search.js";

const { profile } = await requireAdmin();

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const tableWrap = document.getElementById("table-wrap");
  const noResults = document.getElementById("no-results");
  const searchInput = document.getElementById("search-input");
  const rows = document.getElementById("user-rows");

  let users = [];

  function renderTable(list = users) {
    tableWrap.hidden = list.length === 0;
    noResults.hidden = list.length !== 0;
    rows.innerHTML = list
      .map(
        (u) => `
      <tr class="hover:bg-background">
        <td class="px-4 py-3 font-medium text-foreground">${escapeHtml(u.name)}</td>
        <td class="px-4 py-3 text-muted">${escapeHtml(u.email)}</td>
        <td class="px-4 py-3 text-muted">${escapeHtml(u.phone)}</td>
        <td class="px-4 py-3">${u.player_count}</td>
        <td class="px-4 py-3">${u.order_count}</td>
        <td class="px-4 py-3"><span class="badge ${u.active ? "badge-success" : "badge-neutral"}">${u.active ? "Active" : "Inactive"}</span></td>
        <td class="px-4 py-3 text-right">
          <a href="/admin/user.html?id=${encodeURIComponent(u.user_id)}" class="inline-flex text-navy hover:underline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5.5 7 6.5-7 6.5" /></svg>
          </a>
        </td>
      </tr>`
      )
      .join("");
  }

  wireLiveSearch(searchInput, {
    getItems: () => users,
    matches: (u, q) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q),
    onFilter: (filtered) => renderTable(filtered),
  });

  try {
    users = await listUsers();
    loading.hidden = true;
    renderTable();
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
