// Renders the shared parent/admin nav into <div id="nav"> based on which
// partial the current page asks for, then wires up the active-link
// highlight, the cart item-count badge, and sign-out.
//
// How it works (see also README.md, "How shared nav works"): each page
// has an empty container like
//   <div id="nav" data-nav-type="parent" data-nav-page="shop"></div>
// right after <body>. This module fetches the matching partial
// (partials/parent-nav.html or partials/admin-nav.html), inserts its
// HTML into that container, then does small, plain DOM work - no
// framework, no virtual DOM, just fetch + innerHTML + addEventListener.

import { signOut } from "./auth.js";
import { getAdminProfile } from "./api.js";
import { readCart, getItemCount } from "./cart.js";

/** Re-reads the cart from storage and updates every cart badge currently
 * in the nav. Exported so pages that change the cart (shop.js, cart.js)
 * can refresh the badge immediately without a full page reload. */
export function updateCartBadge() {
  const count = getItemCount(readCart());
  document.querySelectorAll("[data-cart-badge]").forEach((el) => {
    if (count > 0) {
      el.hidden = false;
      el.textContent = String(count);
    } else {
      el.hidden = true;
    }
  });
}

async function initNav() {
  const container = document.getElementById("nav");
  if (!container) return;

  const type = container.dataset.navType; // "parent" | "admin"
  const currentPage = container.dataset.navPage;
  const partialUrl = type === "admin" ? "/partials/admin-nav.html" : "/partials/parent-nav.html";

  const res = await fetch(partialUrl);
  container.innerHTML = await res.text();

  container.querySelectorAll("[data-nav-page]").forEach((el) => {
    if (el.dataset.navPage === currentPage) el.classList.add("active");
  });

  container.querySelectorAll("[data-sign-out]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await signOut();
      window.location.href = type === "admin" ? "/admin-login.html" : "/login.html";
    });
  });

  if (type === "parent") {
    updateCartBadge();
  } else if (type === "admin") {
    try {
      const profile = await getAdminProfile();
      container.querySelectorAll("[data-admin-role]").forEach((el) => {
        el.textContent = profile.role;
      });
      container.querySelectorAll("[data-admin-email]").forEach((el) => {
        el.textContent = profile.email;
      });
      if (profile.role !== "ADMIN") {
        container.querySelectorAll("[data-admin-only]").forEach((el) => el.remove());
      }
    } catch {
      // The page's own requireAdmin() guard (assets/js/guard.js) handles
      // redirecting away when the account isn't valid - nav just leaves
      // the role label blank in that case rather than erroring.
    }
  }
}

initNav();
