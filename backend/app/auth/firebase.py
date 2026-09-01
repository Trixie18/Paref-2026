"""Verifies Firebase ID tokens using the Firebase Admin SDK.

The frontend signs the user in with the Firebase JS SDK, obtains an ID
token, and sends it as `Authorization: Bearer <token>`. This module is the
only place that trusts that token — everything downstream (which user it
is, whether they're an admin) is re-derived server-side from it.
"""

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.auth.verifier import AuthIdentity, TokenVerifier
from app.core.errors import UnauthorizedError


class FirebaseVerifier(TokenVerifier):
    def __init__(self, project_id: str, client_email: str, private_key: str):
        if not firebase_admin._apps:
            cred = credentials.Certificate(
                {
                    "type": "service_account",
                    "project_id": project_id,
                    "client_email": client_email,
                    # .env stores the key with literal "\n" sequences; restore real newlines.
                    "private_key": private_key.replace("\\n", "\n"),
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            )
            firebase_admin.initialize_app(cred)

    def verify(self, token: str) -> AuthIdentity:
        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception as exc:  # firebase_admin raises several distinct exception types
            raise UnauthorizedError("Invalid or expired authentication token") from exc
        return AuthIdentity(
            uid=decoded["uid"],
            email=decoded.get("email", ""),
            name=decoded.get("name", ""),
        )
