from typing import Literal

from pydantic import BaseModel

AdminRole = Literal["ADMIN", "STAFF"]


class Admin(BaseModel):
    """Mirrors a row in the Admins sheet."""

    admin_id: str
    firebase_uid: str
    name: str
    email: str
    role: AdminRole
    active: bool = True
