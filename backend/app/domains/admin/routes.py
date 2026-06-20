from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.admin import schemas, service

router = APIRouter(prefix='/admin', tags=['Administración'])

@router.get('/permissions', response_model=schemas.AdminOverview)
def permissions_overview(db: Session = Depends(get_db)):
    return service.overview(db)

@router.post('/permissions/seed', response_model=schemas.AdminOverview)
def seed_permissions(db: Session = Depends(get_db)):
    service.seed_permissions(db)
    return service.overview(db)
