"use client";

import { FormEvent, useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/services/api/auth";
import { getErrorMessage } from "@/services/api/http";
import { PageHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setEmail(profile.email);
        setName(profile.name);
        setPhone(profile.phone);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="My Profile" />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Email address" value={email} disabled readOnly hint="Contact an event organizer to change your email." />
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Mobile number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <ErrorBanner message={error} />
        {saved && !error && <p className="text-sm text-success">Profile updated.</p>}
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
