"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPlayer, updatePlayer } from "@/services/api/players";
import { getErrorMessage } from "@/services/api/http";
import { PageHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageSpinner } from "@/components/ui/Spinner";

export default function PlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPlayer(params.id)
      .then((player) => {
        setPlayerName(player.player_name);
        setTeam(player.team);
        setAgeGroup(player.age_group);
        setJerseyNumber(player.jersey_number);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updatePlayer(params.id, {
        player_name: playerName.trim(),
        team: team.trim(),
        age_group: ageGroup.trim(),
        jersey_number: jerseyNumber.trim(),
      });
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
      <PageHeader title="Edit Player" action={<Button variant="ghost" size="sm" onClick={() => router.push("/players")}>Back</Button>} />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Player name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
        <Input label="Team" value={team} onChange={(e) => setTeam(e.target.value)} />
        <Input label="Age group" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} />
        <Input label="Jersey number" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} />
        <ErrorBanner message={error} />
        {saved && !error && <p className="text-sm text-success">Player updated.</p>}
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
