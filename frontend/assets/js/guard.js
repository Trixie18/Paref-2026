// Protected-route helpers. Every parent page calls requireParent() and
// every admin/staff page calls requireAdmin() at the very top of its
// page script, before rendering anything - mirroring the redirect
// behavior of frontend/app/(parent)/layout.tsx and
// frontend/app/admin/(protected)/layout.tsx.
//
// Both functions redirect (via window.location.href) and never resolve
// in the redirect case, so a caller can safely do:
//   const user = await requireParent();
//   // ...only reached when actually signed in

import { authReady, getCurrentUser, getIdToken } from "./auth.js";
import { getAdminProfile, getProfile, ApiError } from "./api.js";

/** Redirects to login.html if not signed in, or to complete-profile.html
 * if signed in (a real Firebase/dev session exists) but there's no
 * matching Users-sheet row - e.g. the row was deleted by hand, or profile
 * creation was interrupted right after sign-up. Without this check, every
 * protected page would individually fail its own data fetches and show a
 * raw "No profile exists for this account yet" error with no way out.
 * Resolves with {uid, email} once confirmed signed in AND profiled. */
export async function requireParent() {
  await authReady();
  const token = await getIdToken();
  if (!token) {
    window.location.href = "/login.html";
    return new Promise(() => {}); // never resolves; the redirect is in flight
  }
  try {
    await getProfile();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = "/complete-profile.html";
      return new Promise(() => {});
    }
    throw err; // some other failure (network, 500) - let the page show it
  }
  return getCurrentUser();
}

/** Redirects to admin-login.html if not signed in, or if signed in but
 * not an Admins-sheet account (a plain parent account, or a 403/404 from
 * GET /api/admin/profile). Resolves with {user, profile} on success,
 * where profile.role is "ADMIN" or "STAFF". This is a UX convenience
 * only - every admin/staff API call is still independently gated by the
 * backend, which 403s regardless of what this check decided. */
export async function requireAdmin() {
  await authReady();
  const token = await getIdToken();
  if (!token) {
    window.location.href = "/admin-login.html";
    return new Promise(() => {});
  }
  try {
    const profile = await getAdminProfile();
    return { user: getCurrentUser(), profile };
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) {
      // Signed in with a non-admin account, or the profile check failed
      // for another reason - either way this page cannot be shown.
    }
    window.location.href = "/admin-login.html";
    return new Promise(() => {});
  }
}

/** Redirects to admin-login.html if the signed-in account isn't ADMIN
 * specifically (STAFF is turned away too). Call after requireAdmin() on
 * ADMIN-only pages (dashboard, products, bundles, users, audit log). */
export function requireAdminRole(profile) {
  if (!profile || profile.role !== "ADMIN") {
    window.location.href = "/admin/orders.html";
    return false;
  }
  return true;
}
