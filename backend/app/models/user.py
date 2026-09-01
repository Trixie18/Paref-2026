from datetime import datetime

from pydantic import BaseModel


class User(BaseModel):
    """Mirrors a row in the Users sheet."""

    user_id: str
    firebase_uid: str
    name: str
    email: str
    phone: str
    created_at: datetime
    active: bool = True
