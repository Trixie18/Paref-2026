// Logic for admin/audit-log.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { getAuditLog, getErrorMessage } from "../api.js";

const { profile } = await requireAdmin();

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const tableWrap = document.getElementById("table-wrap");
  const noEntries = document.getElementById("no-entries");
  const rows = document.getElementById("log-rows");

  try {
    const entries = await getAuditLog();
    loading.hidden = true;

    if (entries.length === 0) {
      noEntries.hidden = false;
    } else {
      tableWrap.hidden = false;
      rows.innerHTML = entries
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
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
