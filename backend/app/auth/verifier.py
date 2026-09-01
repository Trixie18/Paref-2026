from abc import ABC, abstractmethod

from pydantic import BaseModel


class AuthIdentity(BaseModel):
    """The result of verifying a bearer token, before it is resolved to a
    Users or Admins row. `uid` is the Firebase UID (or, under the dev
    backend, a developer-chosen stand-in for one)."""

    uid: str
    email: str = ""
    name: str = ""


class TokenVerifier(ABC):
    @abstractmethod
    def verify(self, token: str) -> AuthIdentity:
        """Raise app.core.errors.UnauthorizedError if the token is invalid."""
        ...
