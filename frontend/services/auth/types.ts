export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Human-readable message set when the last signUp/signIn attempt failed;
   * pages read this to render an inline error rather than a thrown/caught
   * exception at the call site (both patterns are supported). */
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Raw token string to send as `Bearer <token>`. Always re-reads the
   * live session rather than a stale value, so it is safe to call right
   * after signUp/signIn resolves. */
  getIdToken(): Promise<string | null>;
}
