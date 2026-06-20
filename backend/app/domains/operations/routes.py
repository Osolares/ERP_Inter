from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.operations import schemas, service

router = APIRouter(prefix='/operations', tags=['Centro de Operaciones'])

@router.get('/dashboard', response_model=schemas.OperationsDashboard)
def operations_dashboard(db: Session = Depends(get_db)):
    return service.dashboard(db)

@router.get('/audit', response_model=list[schemas.AuditEntry])
def operations_audit(db: Session = Depends(get_db)):
    return service.audit_entries(db)
