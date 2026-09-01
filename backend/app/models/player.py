from datetime import datetime

from pydantic import BaseModel


class Player(BaseModel):
    """Mirrors a row in the Players sheet."""

    player_id: str
    user_id: str
    player_name: str
    team: str
    age_group: str
    jersey_number: str
    created_at: datetime
