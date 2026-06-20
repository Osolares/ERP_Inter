from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.workspaces import service
from app.domains.workspaces.schemas import WorkspaceOverview, WorkspaceSearchResult

router = APIRouter(prefix='/workspaces', tags=['workspaces'])

@router.get('/smart/overview', response_model=WorkspaceOverview)
def smart_overview(db: Session = Depends(get_db)):
    return service.overview(db)

@router.get('/smart/search', response_model=WorkspaceSearchResult)
def smart_search(q: str = Query('', min_length=0), db: Session = Depends(get_db)):
    return service.search(db, q)
