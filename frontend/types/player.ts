export interface Player {
  player_id: string;
  user_id: string;
  player_name: string;
  team: string;
  age_group: string;
  jersey_number: string;
  created_at: string;
}

export interface PlayerCreateRequest {
  player_name: string;
  team: string;
  age_group: string;
  jersey_number: string;
}

export interface PlayerUpdateRequest {
  player_name?: string;
  team?: string;
  age_group?: string;
  jersey_number?: string;
}
