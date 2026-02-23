from http import HTTPStatus
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, constr

from app.modules.staff import (
    StaffAccountInput,
    StaffCreationError,
    StaffProfilePersistenceError,
    create_staff_account,
)

router = APIRouter(prefix="/staff", tags=["staff"])


class StaffCreateRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6)
    full_name: constr(min_length=1)
    staff_code: constr(min_length=1)
    role: Literal["ADMIN", "STAFF"] = "STAFF"


class StaffCreateResponse(BaseModel):
    user_id: str
    email: EmailStr
    full_name: str
    staff_code: str
    role: str


@router.post("", response_model=StaffCreateResponse, status_code=HTTPStatus.CREATED)
def create_staff(payload: StaffCreateRequest):
    staff_input = StaffAccountInput(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        staff_code=payload.staff_code,
        role=payload.role,
    )

    try:
        return create_staff_account(staff_input)
    except StaffCreationError as exc:
        raise HTTPException(status_code=HTTPStatus.BAD_REQUEST, detail=str(exc)) from exc
    except StaffProfilePersistenceError as exc:
        raise HTTPException(status_code=HTTPStatus.BAD_GATEWAY, detail=str(exc)) from exc
