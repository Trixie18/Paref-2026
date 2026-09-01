"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { AuthContextValue, AuthUser } from "./types";
import { setTokenGetter } from "@/services/api/tokenProvider";

function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

function mapFirebaseError(err: unknown): Error {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Could not reach the authentication server. Check your connection.",
  };
  return new Error(messages[code] || "Something went wrong. Please try again.");
}

function toAuthUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email };
}

export const FirebaseAuthContext = createContext<AuthContextValue | null>(null);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (fbUser) => {
      setUser(toAuthUser(fbUser));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function signUp(email: string, password: string): Promise<void> {
      try {
        await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      } catch (err) {
        throw mapFirebaseError(err);
      }
    }

    async function signIn(email: string, password: string): Promise<void> {
      try {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      } catch (err) {
        throw mapFirebaseError(err);
      }
    }

    async function signOutFn(): Promise<void> {
      await firebaseSignOut(getFirebaseAuth());
    }

    async function getIdToken(): Promise<string | null> {
      const current = getFirebaseAuth().currentUser;
      if (!current) return null;
      return current.getIdToken();
    }

    return { user, loading, signUp, signIn, signOut: signOutFn, getIdToken };
  }, [user, loading]);

  useEffect(() => {
    setTokenGetter(value.getIdToken);
    return () => setTokenGetter(null);
  }, [value.getIdToken]);

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}
