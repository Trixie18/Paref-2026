"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayer } from "@/services/api/players";
import { getErrorMessage } from "@/services/api/http";
import { PageHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function NewPlayerPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Player name is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPlayer({
        player_name: playerName.trim(),
        team: team.trim(),
        age_group: ageGroup.trim(),
        jersey_number: jerseyNumber.trim(),
      });
      router.replace("/players");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add Player" subtitle="Register a player for the event." />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Player name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
        <Input label="Team" placeholder="e.g. Blue" value={team} onChange={(e) => setTeam(e.target.value)} />
        <Input
          label="Age group"
          placeholder="e.g. U12"
          value={ageGroup}
          onChange={(e) => setAgeGroup(e.target.value)}
        />
        <Input
          label="Jersey number"
          placeholder="e.g. 7"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
        />
        <ErrorBanner message={error} />
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "Saving..." : "Save Player"}
        </Button>
      </form>
    </div>
  );
}
