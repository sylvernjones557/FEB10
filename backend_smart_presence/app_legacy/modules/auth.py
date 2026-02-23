from dataclasses import dataclass
from typing import Any, Dict

from supabase import AuthApiError, AuthInvalidCredentialsError

from app.core.supabase_client import supabase


class AuthenticationError(Exception):
    """Raised when Supabase rejects the provided credentials."""


class AuthIntegrationError(Exception):
    """Raised when Supabase Auth encounters an unexpected failure."""


@dataclass
class AuthenticatedUser:
    id: str
    email: str
    role: str | None
    access_token: str
    refresh_token: str | None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.id,
            "email": self.email,
            "role": self.role,
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
        }


def login_user(email: str, password: str):
    """Authenticate against Supabase Auth using email + password."""

    try:
        response = supabase.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except AuthInvalidCredentialsError as exc:
        raise AuthenticationError("Invalid email or password") from exc
    except AuthApiError as exc:
        raise AuthIntegrationError(str(exc)) from exc

    if not response or not response.session or not response.user:
        raise AuthIntegrationError("Supabase returned an empty auth session")

    metadata = response.user.user_metadata or {}

    user = AuthenticatedUser(
        id=response.user.id,
        email=response.user.email or email,
        role=metadata.get("role"),
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
    )

    return user.to_dict()
