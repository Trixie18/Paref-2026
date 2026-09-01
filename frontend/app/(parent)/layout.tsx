"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/services/auth/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ParentNav } from "@/components/layout/ParentNav";
import { PageSpinner } from "@/components/ui/Spinner";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <PageSpinner />;

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <ParentNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">{children}</main>
      </div>
    </CartProvider>
  );
}
