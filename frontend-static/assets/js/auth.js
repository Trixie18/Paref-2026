// Auth - dev mode and real Firebase, both behind one small interface:
//   signUp(email, password) -> Promise<void>
//   signIn(email, password) -> Promise<void>
//   signOut() -> Promise<void>
//   getIdToken() -> Promise<string|null>   (the bearer token, or null if signed out)
//   getCurrentUser() -> {uid, email} | null   (synchronous, reads local state)
//   onAuthChange(callback) -> unsubscribe()   (fires with the current user whenever it changes)
//
// Every page/module that needs auth (guard.js, nav.js, pages/*.js) only
// ever calls these functions - never localStorage or the Firebase SDK
// directly - so switching AUTH_MODE below is the only change needed to
// move from dev mode to real Firebase.

// ---------------------------------------------------------------------
// Switch to "firebase" to use real Firebase Authentication instead of
// the fake dev-mode tokens. When you do, fill in the FIREBASE_* constants
// below with your Firebase project's web app config (Project Settings ->
// General -> Your apps -> SDK setup and configuration), matching what the
// Next.js app's NEXT_PUBLIC_FIREBASE_* env vars hold.
export const AUTH_MODE = "dev"; // "dev" | "firebase"

const FIREBASE_API_KEY = "";
const FIREBASE_AUTH_DOMAIN = "";
const FIREBASE_PROJECT_ID = "";
const FIREBASE_APP_ID = "";
// -----------------------------------------------------------------------

const CURRENT_KEY = "paref_dev_current";
const EMAIL_MAP_KEY = "paref_dev_email_map";

// Pre-seeded so the admin/staff and parent accounts created by the
// backend's seed script (backend/seed/seed_data.py, run automatically
// when REPOSITORY_BACKEND=memory and SEED_ON_STARTUP=true) can be signed
// into immediately in dev mode without this app having "created" them
// itself. Any other email just gets a fresh random uid, which correctly
// has no backend profile / admin row yet. Matches
// frontend/services/auth/devAuthProvider.tsx exactly.
export const SEED_EMAIL_MAP = {
  "dana.admin@example.test": "dev-admin-1",
  "sam.staff@example.test": "dev-staff-1",
  "maria.delacruz@example.test": "dev-parent-1",
  "jose.santos@example.test": "dev-parent-2",
  "ana.reyes@example.test": "dev-parent-3",
  "carlos.bautista@example.test": "dev-parent-4",
  "liza.fernandez@example.test": "dev-parent-5",
};

export function readEmailMap() {
  try {
    const raw = localStorage.getItem(EMAIL_MAP_KEY);
    if (!raw) {
      localStorage.setItem(EMAIL_MAP_KEY, JSON.stringify(SEED_EMAIL_MAP));
      return { ...SEED_EMAIL_MAP };
    }
    return { ...SEED_EMAIL_MAP, ...JSON.parse(raw) };
  } catch {
    return { ...SEED_EMAIL_MAP };
  }
}

export function writeEmailMap(map) {
  try {
    localStorage.setItem(EMAIL_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore quota/availability errors
  }
}

function readCurrentSession() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCurrentSession(user) {
  try {
    if (user) localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    // ignore
  }
}

export function randomUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Dev mode ---------------------------------------------------------

async function devSignUp(email, _password) {
  void _password; // dev mode cannot verify passwords without Firebase
  const normalized = email.trim().toLowerCase();
  const map = readEmailMap();
  if (map[normalized]) {
    throw new Error("This email is already registered. Try signing in instead.");
  }
  const uid = randomUid();
  map[normalized] = uid;
  writeEmailMap(map);
  const user = { uid, email: normalized };
  writeCurrentSession(user);
  notify(user);
}

async function devSignIn(email, _password) {
  void _password;
  const normalized = email.trim().toLowerCase();
  const map = readEmailMap();
  let uid = map[normalized];
  if (!uid) {
    uid = randomUid();
    map[normalized] = uid;
    writeEmailMap(map);
  }
  const user = { uid, email: normalized };
  writeCurrentSession(user);
  notify(user);
}

async function devSignOut() {
  writeCurrentSession(null);
  notify(null);
}

async function devGetIdToken() {
  const session = readCurrentSession();
  if (!session) return null;
  return `dev:${session.uid}:${session.email || ""}`;
}

function devGetCurrentUser() {
  return readCurrentSession();
}

// ---- Firebase mode ------------------------------------------------------
// Loaded lazily (dynamic import) so dev mode never needs network access to
// gstatic.com and Node-based tests never hit this path.

let firebaseAuthPromise = null;
let firebaseReadyResolve = null;
const firebaseReadyPromise = new Promise((resolve) => {
  firebaseReadyResolve = resolve;
});
let firebaseReadyFired = false;

async function getFirebaseAuth() {
  if (!firebaseAuthPromise) {
    firebaseAuthPromise = (async () => {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
      const authModule = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
      const app = getApps().length
        ? getApps()[0]
        : initializeApp({
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN,
            projectId: FIREBASE_PROJECT_ID,
            appId: FIREBASE_APP_ID,
          });
      const auth = authModule.getAuth(app);
      authModule.onAuthStateChanged(auth, (fbUser) => {
        notify(fbUser ? { uid: fbUser.uid, email: fbUser.email } : null);
        if (!firebaseReadyFired) {
          firebaseReadyFired = true;
          firebaseReadyResolve();
        }
      });
      return { auth, authModule };
    })();
  }
  return firebaseAuthPromise;
}

/** Resolves once Firebase has restored (or confirmed there is no) an
 * existing session - i.e. after the first onAuthStateChanged callback.
 * guard.js awaits this (via getIdToken/getCurrentUser) so a page doesn't
 * redirect to the login page before Firebase has had a chance to report
 * an already-signed-in user. No-op / already-resolved in dev mode. */
export async function authReady() {
  if (AUTH_MODE !== "firebase") return;
  await getFirebaseAuth();
  await firebaseReadyPromise;
}

const FIREBASE_ERROR_MESSAGES = {
  "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Could not reach the authentication server. Check your connection.",
};

function mapFirebaseError(err) {
  const code = err && err.code ? String(err.code) : "";
  return new Error(FIREBASE_ERROR_MESSAGES[code] || "Something went wrong. Please try again.");
}

async function firebaseSignUp(email, password) {
  const { auth, authModule } = await getFirebaseAuth();
  try {
    await authModule.createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

async function firebaseSignIn(email, password) {
  const { auth, authModule } = await getFirebaseAuth();
  try {
    await authModule.signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw mapFirebaseError(err);
  }
}

async function firebaseSignOutFn() {
  const { auth, authModule } = await getFirebaseAuth();
  await authModule.signOut(auth);
}

async function firebaseGetIdToken() {
  const { auth } = await getFirebaseAuth();
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
}

let firebaseCurrentUser = null;

// ---- Shared change-notification -----------------------------------------

const listeners = new Set();

function notify(user) {
  if (AUTH_MODE === "firebase") firebaseCurrentUser = user;
  for (const cb of listeners) cb(user);
}

export function onAuthChange(callback) {
  listeners.add(callback);
  // Fire once immediately with the current state, mirroring
  // onAuthStateChanged's initial callback.
  callback(getCurrentUser());
  return () => listeners.delete(callback);
}

// ---- Public interface -----------------------------------------------------

export async function signUp(email, password) {
  return AUTH_MODE === "firebase" ? firebaseSignUp(email, password) : devSignUp(email, password);
}

export async function signIn(email, password) {
  return AUTH_MODE === "firebase" ? firebaseSignIn(email, password) : devSignIn(email, password);
}

export async function signOut() {
  return AUTH_MODE === "firebase" ? firebaseSignOutFn() : devSignOut();
}

export async function getIdToken() {
  try {
    if (AUTH_MODE === "firebase") {
      await authReady();
      return await firebaseGetIdToken();
    }
    return await devGetIdToken();
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return AUTH_MODE === "firebase" ? firebaseCurrentUser : devGetCurrentUser();
}

/** Registers the backend Users-sheet profile row right after a
 * successful sign-up, same as the other clients. Call this with the
 * {name, phone} the sign-up form collected. A 409 (profile already
 * exists, e.g. a retried submit) is not treated as a failure. */
export async function registerBackendProfile(apiFetch, { name, phone }) {
  try {
    return await apiFetch("/api/auth/register", { method: "POST", body: { name, phone } });
  } catch (err) {
    if (err && err.status === 409) return null;
    throw err;
  }
}
