from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.settings import schemas, service

router = APIRouter(prefix='/settings', tags=['Configuración'])

@router.get('', response_model=schemas.SettingsGrouped)
def get_settings(db: Session = Depends(get_db)):
    return service.list_settings(db)

@router.post('/seed', response_model=schemas.SettingsGrouped)
def seed_settings(db: Session = Depends(get_db)):
    service.reset_defaults(db)
    return service.list_settings(db)

@router.put('', response_model=schemas.SettingsGrouped)
def update_settings(data: schemas.SettingsBulkUpdate, db: Session = Depends(get_db)):
    return service.update_settings(db, data.settings)

@router.get('/defaults')
def public_defaults(db: Session = Depends(get_db)):
    return service.get_public_defaults(db)
