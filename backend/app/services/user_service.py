from datetime import datetime, timezone

from app.auth.verifier import AuthIdentity
from app.core.errors import DuplicateError
from app.models import User
from app.repositories import Repository
from app.schemas.auth import ProfileUpdateRequest, RegisterRequest


def register(repo: Repository, identity: AuthIdentity, req: RegisterRequest) -> User:
    """Creates the Users sheet row for an account that already exists in
    Firebase. The Firebase account itself (and its email uniqueness) is
    created client-side; this only guards against calling it twice for the
    same account, or against a stale duplicate email in the sheet."""
    if repo.get_user_by_firebase_uid(identity.uid) is not None:
        raise DuplicateError("A profile already exists for this account")
    if identity.email and repo.get_user_by_email(identity.email) is not None:
        raise DuplicateError("An account with this email already exists")

    return repo.create_user(
        User(
            user_id="",
            firebase_uid=identity.uid,
            name=req.name,
            email=identity.email,
            phone=req.phone,
            created_at=datetime.now(timezone.utc),
            active=True,
        )
    )


def update_profile(repo: Repository, user: User, req: ProfileUpdateRequest) -> User:
    fields = {k: v for k, v in req.model_dump(exclude_unset=True).items() if v is not None}
    if not fields:
        return user
    return repo.update_user(user.user_id, **fields)
