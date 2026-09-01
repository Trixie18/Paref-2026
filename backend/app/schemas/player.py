from datetime import datetime

from pydantic import BaseModel, field_validator


class PlayerCreateRequest(BaseModel):
    player_name: str
    team: str
    age_group: str
    jersey_number: str

    @field_validator("player_name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Player name is required")
        return v.strip()


class PlayerUpdateRequest(BaseModel):
    player_name: str | None = None
    team: str | None = None
    age_group: str | None = None
    jersey_number: str | None = None


class PlayerResponse(BaseModel):
    player_id: str
    user_id: str
    player_name: str
    team: str
    age_group: str
    jersey_number: str
    created_at: datetime
