"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AdminNav } from "@/components/layout/AdminNav";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = useAdminSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "unauthenticated" || session.status === "not-admin") {
      router.replace("/admin/login");
    }
  }, [session, router]);

  if (session.status !== "ready") return <PageSpinner />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminNav role={session.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
