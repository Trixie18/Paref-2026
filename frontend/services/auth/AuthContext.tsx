"use client";

import { useContext } from "react";
import { DevAuthContext, DevAuthProvider } from "./devAuthProvider";
import { FirebaseAuthContext, FirebaseAuthProvider } from "./firebaseAuthProvider";
import { AuthContextValue } from "./types";

export type { AuthContextValue, AuthUser } from "./types";

function authMode(): "dev" | "firebase" {
  return process.env.NEXT_PUBLIC_AUTH_MODE === "dev" ? "dev" : "firebase";
}

/** Backs both the parent app and the admin/staff app — same token
 * mechanism, same context shape. Which concrete implementation runs is
 * chosen once at build/runtime via NEXT_PUBLIC_AUTH_MODE. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (authMode() === "dev") {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

export function useAuth(): AuthContextValue {
  const devValue = useContext(DevAuthContext);
  const firebaseValue = useContext(FirebaseAuthContext);
  const value = authMode() === "dev" ? devValue : firebaseValue;
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}
