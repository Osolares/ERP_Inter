from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.reports import schemas, service

router = APIRouter(prefix='/reports', tags=['Reportes'])

@router.get('/dashboard', response_model=schemas.ReportsDashboard)
def reports_dashboard(db: Session = Depends(get_db)):
    return service.dashboard(db)
