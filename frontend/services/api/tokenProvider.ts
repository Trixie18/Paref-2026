/**
 * Small indirection so the plain-function API client (services/api/*) can
 * attach a bearer token without importing React or the AuthProvider
 * directly. The active AuthProvider registers its `getIdToken` here once
 * on mount; the getter always re-reads the live session (localStorage or
 * the Firebase SDK's current user) rather than a stale closure value.
 */
type TokenGetter = () => Promise<string | null>;

let currentGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null): void {
  currentGetter = getter;
}

export async function getAuthToken(): Promise<string | null> {
  if (!currentGetter) return null;
  try {
    return await currentGetter();
  } catch {
    return null;
  }
}
