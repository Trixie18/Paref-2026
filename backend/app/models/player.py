from datetime import datetime

from pydantic import BaseModel


class Player(BaseModel):
    """Mirrors a row in the Players sheet.

    parent_name is a denormalized snapshot of the parent's name at the
    time the player was added — same tradeoff as Order_Items.product_name:
    it makes the raw spreadsheet human-readable (you can see whose child
    is whose without cross-referencing the Users sheet by user_id), at the
    cost of not automatically updating if the parent later renames their
    profile. user_id remains the authoritative link the app itself uses.
    """

    player_id: str
    user_id: str
    parent_name: str
    player_name: str
    team: str
    age_group: str
    jersey_number: str
    created_at: datetime
