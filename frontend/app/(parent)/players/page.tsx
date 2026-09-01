"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPlayers } from "@/services/api/players";
import { getErrorMessage } from "@/services/api/http";
import { Player } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, PlusIcon } from "@/components/icons";

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPlayers()
      .then(setPlayers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="My Players"
        subtitle="The players you're registering for the event."
        action={
          <Link href="/players/new">
            <Button size="sm">
              <PlusIcon className="h-4 w-4" /> Add Player
            </Button>
          </Link>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : players.length === 0 ? (
        <EmptyState
          title="No players yet"
          description="Add your child as a player to register them for the event."
          action={
            <Link href="/players/new">
              <Button size="sm">Add Player</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {players.map((player) => (
            <li key={player.player_id}>
              <Link
                href={`/players/${player.player_id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-background"
              >
                <div>
                  <p className="font-medium text-foreground">{player.player_name}</p>
                  <p className="text-sm text-muted">
                    {player.age_group} {player.team} &middot; Jersey #{player.jersey_number}
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
