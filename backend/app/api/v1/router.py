from fastapi import APIRouter
from app.core.config.settings import settings
from app.domains.inventory.routes import router as inventory_router
from app.domains.settings.routes import router as settings_router
from app.domains.admin.routes import router as admin_router
from app.domains.financial.routes import router as financial_router
from app.domains.reports.routes import router as reports_router
from app.domains.operations.routes import router as operations_router
from app.domains.automotive.routes import router as automotive_router
from app.domains.disassembly.routes import router as disassembly_router
from app.domains.multimedia.routes import router as multimedia_router
from app.domains.workspaces.routes import router as workspaces_router
from app.domains.settings.service import get_public_defaults
from app.core.database.session import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

api_router = APIRouter()
api_router.include_router(inventory_router)
api_router.include_router(settings_router)
api_router.include_router(admin_router)
api_router.include_router(financial_router)
api_router.include_router(reports_router)
api_router.include_router(operations_router)
api_router.include_router(automotive_router)
api_router.include_router(disassembly_router)
api_router.include_router(multimedia_router)
api_router.include_router(workspaces_router)

@api_router.get('/health')
def health():
    return {'status': 'ok', 'version': '16.7.0'}

@api_router.get('/config/defaults')
def config_defaults(db: Session = Depends(get_db)):
    return get_public_defaults(db)
