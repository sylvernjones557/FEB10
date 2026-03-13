
from typing import Any
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import schemas, models
from app.api import deps
from app.core import security
from app.core.config import settings
from app.db.session import get_db

router = APIRouter()


@router.post("/login/access-token", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    staff = db.query(models.Staff).filter(
        models.Staff.staff_code == form_data.username
    ).first()
    if not staff or not staff.hashed_password or not security.verify_password(form_data.password, staff.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect staff code or password")
    elif not staff.is_active:
        raise HTTPException(status_code=400, detail="Inactive staff")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            staff.staff_code, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
