"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/services/auth/AuthContext";
import { getAdminProfile } from "@/services/api/admin";
import { ApiError } from "@/services/api/http";
import { AdminProfile } from "@/types";

export type AdminRole = "ADMIN" | "STAFF";

export type AdminSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "not-admin" }
  | { status: "ready"; role: AdminRole; profile: AdminProfile };

/** GET /api/admin/profile is the admin-app equivalent of the parent app's
 * GET /api/auth/profile — it 403s for a non-admin account and otherwise
 * reports which role (ADMIN or STAFF) this account has. */
export function useAdminSession(): AdminSessionState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      // state is already { status: "loading" } from useState's initial
      // value at this point, since authLoading only ever transitions
      // true -> false once (never back), so there is nothing to set yet.
      return;
    }
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a sign-out that may follow a previously "ready" state
      setState({ status: "unauthenticated" });
      return;
    }

    setState({ status: "loading" });

    (async () => {
      try {
        const profile = await getAdminProfile();
        if (!cancelled) setState({ status: "ready", role: profile.role, profile });
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) setState({ status: "unauthenticated" });
          else setState({ status: "not-admin" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}
