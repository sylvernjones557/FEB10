from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps
from app.db.session import get_db

router = APIRouter()


@router.get("/", response_model=List[schemas.Organization])
def read_organizations(
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    return db.query(models.Organization).all()


@router.post("/", response_model=schemas.Organization)
def create_organization(
    *,
    db: Session = Depends(get_db),
    org_in: schemas.OrganizationCreate,
    current_user: models.Staff = Depends(deps.get_current_active_superuser),
) -> Any:
    org = models.Organization(name=org_in.name)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/{org_id}", response_model=schemas.Organization)
def read_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.Staff = Depends(deps.get_current_active_user),
) -> Any:
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org
