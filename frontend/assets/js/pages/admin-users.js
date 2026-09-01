// Logic for admin/users.html (ADMIN only).
import { requireAdmin, requireAdminRole } from "../guard.js";
import { listUsers, getErrorMessage } from "../api.js";

const { profile } = await requireAdmin();

if (requireAdminRole(profile)) {
  const loading = document.getElementById("loading");
  const errorBanner = document.getElementById("error-banner");
  const tableWrap = document.getElementById("table-wrap");
  const rows = document.getElementById("user-rows");

  try {
    const users = await listUsers();
    loading.hidden = true;
    tableWrap.hidden = false;
    rows.innerHTML = users
      .map(
        (u) => `
      <tr class="hover:bg-background">
        <td class="px-4 py-3 font-medium text-foreground">${u.name}</td>
        <td class="px-4 py-3 text-muted">${u.email}</td>
        <td class="px-4 py-3 text-muted">${u.phone}</td>
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
  } catch (err) {
    loading.hidden = true;
    errorBanner.hidden = false;
    errorBanner.textContent = getErrorMessage(err);
  }
}
