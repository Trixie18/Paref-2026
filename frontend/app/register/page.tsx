"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/services/auth/AuthContext";
import { registerProfile } from "@/services/api/auth";
import { getErrorMessage, ApiError } from "@/services/api/http";
import { RegisterFormFields, validateRegisterForm } from "@/lib/validation";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Logo } from "@/components/layout/Logo";

const initialFields: RegisterFormFields = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

export default function RegisterPage() {
  const { signUp, getIdToken } = useAuth();
  const router = useRouter();
  const [fields, setFields] = useState<RegisterFormFields>(initialFields);
  const [errors, setErrors] = useState<ReturnType<typeof validateRegisterForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof RegisterFormFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const validationErrors = validateRegisterForm(fields);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signUp(fields.email.trim(), fields.password);
      const token = await getIdToken();
      if (!token) throw new Error("Sign-up succeeded but no session was created. Please try logging in.");

      try {
        await registerProfile({ name: fields.name.trim(), phone: fields.phone.trim() });
      } catch (err) {
        // A profile that already exists for this account (e.g. a retried
        // submit) is not a failure from the user's point of view.
        if (!(err instanceof ApiError && err.status === 409)) throw err;
      }

      router.replace("/dashboard");
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo size={40} />
        <h1 className="text-xl font-semibold text-navy">Create your parent account</h1>
        <p className="text-center text-sm text-muted">Register once to add players and shop for the event.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          label="Full name"
          autoComplete="name"
          value={fields.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          value={fields.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <Input
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="09171234567"
          value={fields.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={errors.phone}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={fields.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          hint="At least 6 characters."
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={fields.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        <ErrorBanner message={formError} />

        <Button type="submit" size="lg" disabled={submitting} fullWidth>
          {submitting ? "Creating account..." : "Register"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-navy hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
