// Logic for admin/audit-log.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { getAuditLog, getErrorMessage } from "../api.js";
import { wireLiveSearch } from "../search.js";

const { profile } = await requireAdmin();

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const tableWrap = document.getElementById("table-wrap");
  const noEntries = document.getElementById("no-entries");
  const noResults = document.getElementById("no-results");
  const searchWrap = document.getElementById("search-wrap");
  const searchInput = document.getElementById("search-input");
  const rows = document.getElementById("log-rows");

  let entries = [];

  function renderTable(list) {
    tableWrap.hidden = list.length === 0;
    noResults.hidden = !(entries.length > 0 && list.length === 0);
    rows.innerHTML = list
      .map(
        (entry) => `
      <tr>
        <td class="whitespace-nowrap px-4 py-3 text-muted">${new Date(entry.timestamp).toLocaleString()}</td>
        <td class="px-4 py-3 text-foreground">${entry.admin_name}</td>
        <td class="px-4 py-3 font-medium text-foreground">${entry.action}</td>
        <td class="px-4 py-3 text-muted">${entry.entity_type} ${entry.entity_id}</td>
        <td class="px-4 py-3 text-muted">${entry.details}</td>
      </tr>`
      )
      .join("");
  }

  const applySearch = wireLiveSearch(searchInput, {
    getItems: () => entries,
    matches: (e, q) =>
      e.admin_name.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.entity_type.toLowerCase().includes(q) ||
      e.entity_id.toLowerCase().includes(q) ||
      (e.details || "").toLowerCase().includes(q),
    onFilter: (filtered) => renderTable(filtered),
  });

  try {
    entries = await getAuditLog();
    loading.hidden = true;

    if (entries.length === 0) {
      noEntries.hidden = false;
    } else {
      searchWrap.hidden = false;
      applySearch();
    }
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
