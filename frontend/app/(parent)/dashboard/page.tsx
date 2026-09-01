"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProfile } from "@/services/api/auth";
import { listPlayers } from "@/services/api/players";
import { listOrders } from "@/services/api/orders";
import { getErrorMessage } from "@/services/api/http";
import { useCart } from "@/contexts/CartContext";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Card } from "@/components/ui/Card";
import { PlayersIcon, OrdersIcon, CartIcon, ChevronRightIcon } from "@/components/icons";

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { itemCount } = useCart();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile(), listPlayers(), listOrders()])
      .then(([profile, players, orders]) => {
        if (cancelled) return;
        setName(profile.name);
        setPlayerCount(players.length);
        setOrderCount(orders.length);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageSpinner />;

  const tiles = [
    { href: "/players", label: "My Players", value: playerCount, icon: PlayersIcon },
    { href: "/orders", label: "My Orders", value: orderCount, icon: OrdersIcon },
    { href: "/cart", label: "Cart", value: itemCount, icon: CartIcon },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-navy sm:text-2xl">Welcome, {name || "there"}</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s a quick look at your account.</p>

      <ErrorBanner message={error} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href}>
            <Card className="flex items-center justify-between p-4 transition-colors hover:border-navy">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/5 text-navy">
                  <tile.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm text-muted">{tile.label}</p>
                  <p className="text-lg font-semibold text-foreground">{tile.value}</p>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-muted" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/shop">
          <Card className="flex items-center justify-between p-4 hover:border-navy">
            <div>
              <p className="font-medium text-foreground">Visit the event shop</p>
              <p className="text-sm text-muted">Shirts, individual items, and bundles.</p>
            </div>
            <ChevronRightIcon className="h-4 w-4 text-muted" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
