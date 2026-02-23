from contextlib import suppress
from dataclasses import dataclass
from typing import Any, Dict

from supabase import AuthApiError, PostgrestAPIError

from app.core.supabase_client import supabase


class StaffCreationError(Exception):
    """Raised when Supabase Auth cannot create the staff user."""


class StaffProfilePersistenceError(Exception):
    """Raised when the staff profile row could not be stored."""


@dataclass
class StaffAccountInput:
    email: str
    password: str
    full_name: str
    staff_code: str
    role: str = "STAFF"

    def metadata(self) -> Dict[str, Any]:
        return {
            "full_name": self.full_name,
            "role": self.role,
            "staff_code": self.staff_code,
        }

    def profile_row(self, user_id: str) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "staff_code": self.staff_code,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
        }


def create_staff_account(payload: StaffAccountInput) -> Dict[str, Any]:
    """Provision a Supabase Auth user and persist the staff profile."""

    try:
        user_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": payload.metadata(),
            }
        )
    except AuthApiError as exc:
        raise StaffCreationError(str(exc)) from exc

    if not user_response or not user_response.user:
        raise StaffCreationError("Supabase did not return the staff user")

    user_id = user_response.user.id

    try:
        supabase.table("staff_profiles").insert(
            payload.profile_row(user_id)
        ).execute()
    except PostgrestAPIError as exc:
        # Attempt to roll back the auth user to keep state consistent.
        with suppress(Exception):
            supabase.auth.admin.delete_user(user_id)
        raise StaffProfilePersistenceError(str(exc)) from exc

    return {
        "user_id": user_id,
        "email": payload.email,
        "full_name": payload.full_name,
        "staff_code": payload.staff_code,
        "role": payload.role,
    }
