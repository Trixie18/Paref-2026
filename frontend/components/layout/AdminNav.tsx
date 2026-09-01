"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/services/auth/AuthContext";
import { Logo } from "./Logo";
import { AdminRole } from "@/hooks/useAdminSession";
import { DashboardIcon, BoxIcon, LayersIcon, OrdersIcon, UsersIcon, LogIcon, LogoutIcon } from "@/components/icons";

const allItems: { href: string; label: string; icon: typeof DashboardIcon; adminOnly: boolean }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon, adminOnly: true },
  { href: "/admin/orders", label: "Orders", icon: OrdersIcon, adminOnly: false },
  { href: "/admin/products", label: "Products", icon: BoxIcon, adminOnly: true },
  { href: "/admin/bundles", label: "Bundles", icon: LayersIcon, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: UsersIcon, adminOnly: true },
  { href: "/admin/audit-log", label: "Audit Log", icon: LogIcon, adminOnly: true },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const items = allItems.filter((item) => role === "ADMIN" || !item.adminOnly);

  async function handleSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <header className="border-b border-border bg-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <div className="leading-tight">
              <div className="font-semibold">Paref Admin</div>
              <div className="text-[11px] uppercase tracking-wide text-white/60">{role}</div>
            </div>
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-white/70 sm:hidden">
            <LogoutIcon className="h-4 w-4" />
          </button>
        </div>
        <nav className="-mx-1 flex flex-wrap gap-1 overflow-x-auto">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-sm text-white/70">{user?.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
