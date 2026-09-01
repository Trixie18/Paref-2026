"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { AuthContextValue, AuthUser } from "./types";
import { setTokenGetter } from "@/services/api/tokenProvider";

const CURRENT_KEY = "paref_dev_current";
const EMAIL_MAP_KEY = "paref_dev_email_map";

// Pre-seeded so the admin/staff and parent accounts created by the
// backend's seed script (seed/seed_data.py, REPOSITORY_BACKEND=memory,
// SEED_ON_STARTUP=true) can be signed into immediately in dev mode without
// the app having "created" them itself. Any other email just gets a fresh
// random uid, which correctly has no backend profile / admin row yet.
const SEED_EMAIL_MAP: Record<string, string> = {
  "dana.admin@example.test": "dev-admin-1",
  "sam.staff@example.test": "dev-staff-1",
  "maria.delacruz@example.test": "dev-parent-1",
  "jose.santos@example.test": "dev-parent-2",
  "ana.reyes@example.test": "dev-parent-3",
  "carlos.bautista@example.test": "dev-parent-4",
  "liza.fernandez@example.test": "dev-parent-5",
};

function readEmailMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EMAIL_MAP_KEY);
    if (!raw) {
      window.localStorage.setItem(EMAIL_MAP_KEY, JSON.stringify(SEED_EMAIL_MAP));
      return { ...SEED_EMAIL_MAP };
    }
    return { ...SEED_EMAIL_MAP, ...JSON.parse(raw) };
  } catch {
    return { ...SEED_EMAIL_MAP };
  }
}

function writeEmailMap(map: Record<string, string>): void {
  try {
    window.localStorage.setItem(EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore quota/availability errors
  }
}

function readCurrentSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CURRENT_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCurrentSession(user: AuthUser | null): void {
  try {
    if (user) window.localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}

function randomUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const DevAuthContext = createContext<AuthContextValue | null>(null);

export function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the session must resolve
    // to signed-out on the server and hydrate on the client — reading it
    // any earlier than this effect would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readCurrentSession());
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function signUp(email: string, _password: string): Promise<void> {
      void _password; // dev mode cannot verify passwords without Firebase
      const normalized = email.trim().toLowerCase();
      const map = readEmailMap();
      if (map[normalized]) {
        throw new Error("This email is already registered. Try signing in instead.");
      }
      const uid = randomUid();
      map[normalized] = uid;
      writeEmailMap(map);
      const nextUser: AuthUser = { uid, email: normalized };
      writeCurrentSession(nextUser);
      setUser(nextUser);
    }

    async function signIn(email: string, _password: string): Promise<void> {
      void _password;
      const normalized = email.trim().toLowerCase();
      const map = readEmailMap();
      let uid = map[normalized];
      if (!uid) {
        uid = randomUid();
        map[normalized] = uid;
        writeEmailMap(map);
      }
      const nextUser: AuthUser = { uid, email: normalized };
      writeCurrentSession(nextUser);
      setUser(nextUser);
    }

    async function signOutFn(): Promise<void> {
      writeCurrentSession(null);
      setUser(null);
    }

    async function getIdToken(): Promise<string | null> {
      const session = readCurrentSession();
      if (!session) return null;
      return `dev:${session.uid}:${session.email ?? ""}`;
    }

    return { user, loading, signUp, signIn, signOut: signOutFn, getIdToken };
  }, [user, loading]);

  useEffect(() => {
    setTokenGetter(value.getIdToken);
    return () => setTokenGetter(null);
  }, [value.getIdToken]);

  return <DevAuthContext.Provider value={value}>{children}</DevAuthContext.Provider>;
}
