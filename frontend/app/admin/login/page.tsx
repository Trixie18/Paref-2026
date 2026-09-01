"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/services/auth/AuthContext";
import { useAdminSession } from "@/hooks/useAdminSession";
import { getErrorMessage } from "@/services/api/http";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Logo } from "@/components/layout/Logo";

export default function AdminLoginPage() {
  const { signIn, signOut, user } = useAuth();
  const session = useAdminSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session.status === "ready") {
      router.replace(session.role === "ADMIN" ? "/admin/dashboard" : "/admin/orders");
    }
  }, [session, router]);

  useEffect(() => {
    if (session.status === "not-admin") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with signing the ineligible account back out, a real external action
      setError("This account is not an administrator or staff member.");
      setSubmitting(false);
      void signOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  }

  const verifying = Boolean(user) && session.status === "loading";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo size={40} />
        <h1 className="text-xl font-semibold text-navy">Admin &amp; Staff Login</h1>
        <p className="text-center text-sm text-muted">
          For provisioned administrator and staff accounts only.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ErrorBanner message={error} />

        <Button type="submit" size="lg" variant="secondary" disabled={submitting || verifying} fullWidth>
          {verifying ? "Verifying access..." : submitting ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </div>
  );
}
