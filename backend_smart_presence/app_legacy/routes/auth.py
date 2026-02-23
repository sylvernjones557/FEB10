from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, constr

from app.modules import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6)


class LoginResponse(BaseModel):
    user_id: str
    email: EmailStr
    role: str | None = None
    access_token: str
    refresh_token: str | None = None


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    try:
        return auth_service.login_user(payload.email, payload.password)
    except auth_service.AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except auth_service.AuthIntegrationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
