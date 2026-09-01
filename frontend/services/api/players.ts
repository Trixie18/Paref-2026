import { apiFetch } from "./http";
import { Player, PlayerCreateRequest, PlayerUpdateRequest } from "@/types";

export function listPlayers(): Promise<Player[]> {
  return apiFetch<Player[]>("/api/players");
}

export function createPlayer(req: PlayerCreateRequest): Promise<Player> {
  return apiFetch<Player>("/api/players", { method: "POST", body: req });
}

export function getPlayer(playerId: string): Promise<Player> {
  return apiFetch<Player>(`/api/players/${encodeURIComponent(playerId)}`);
}

export function updatePlayer(playerId: string, req: PlayerUpdateRequest): Promise<Player> {
  return apiFetch<Player>(`/api/players/${encodeURIComponent(playerId)}`, { method: "PUT", body: req });
}
