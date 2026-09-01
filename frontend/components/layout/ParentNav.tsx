"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/services/auth/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Logo } from "./Logo";
import { HomeIcon, ShopIcon, CartIcon, OrdersIcon, ProfileIcon, LogoutIcon } from "@/components/icons";

const navItems = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/shop", label: "Shop", icon: ShopIcon },
  { href: "/cart", label: "Cart", icon: CartIcon },
  { href: "/orders", label: "Orders", icon: OrdersIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

export function ParentNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <>
      {/* Desktop / tablet top nav */}
      <header className="hidden border-b border-border bg-surface sm:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-semibold text-navy">Paref Cup</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href) ? "bg-navy text-white" : "text-foreground hover:bg-black/5"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === "/cart" && itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                    {itemCount}
                  </span>
                )}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-black/5"
            >
              <LogoutIcon className="h-4 w-4" />
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile top bar (branding only) */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-semibold text-navy">Paref Cup</span>
        </Link>
        <button onClick={handleSignOut} aria-label="Sign out" className="p-2 text-muted">
          <LogoutIcon className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                isActive(item.href) ? "text-accent" : "text-muted"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.href === "/cart" && itemCount > 0 && (
                <span className="absolute right-1/2 top-1 flex h-4 min-w-4 translate-x-3 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
