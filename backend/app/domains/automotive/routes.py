from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.automotive import service, schemas

router = APIRouter(prefix='/automotive', tags=['Automotriz Pro'])

@router.get('/overview', response_model=schemas.AutomotiveOverview)
def get_overview(db: Session = Depends(get_db)):
    return service.overview(db)

@router.post('/automation/preview-product', response_model=schemas.ProductAutomationPreview)
def preview_product_automation(data: schemas.ProductAutomationPreviewRequest, db: Session = Depends(get_db)):
    return service.preview_product_automation(db, data)


@router.post('/automation/preview-sku', response_model=schemas.SkuRuleResult)
def preview_sku_rule(data: schemas.SkuRulePreview):
    return service.preview_sku_rule(data)

@router.post('/compatibilities/preview', response_model=schemas.CompatibilityPreview)
def preview_compatibility(data: schemas.CompatibilityPreviewRequest, db: Session = Depends(get_db)):
    return service.preview_compatibility(db, data)

@router.post('/documents/description', response_model=schemas.DocumentDescriptionResult)
def document_description(data: schemas.DocumentDescriptionRequest):
    return service.build_document_description(data)


@router.post('/search/global', response_model=schemas.AutomotiveSearchResponse)
def automotive_global_search(data: schemas.AutomotiveSearchRequest, db: Session = Depends(get_db)):
    return service.automotive_global_search(db, data)

@router.post('/oem/normalize', response_model=schemas.OemNormalizeResult)
def normalize_oem(data: schemas.OemNormalizeRequest):
    return service.normalize_oem(data)

@router.post('/product-lot/assistant', response_model=schemas.ProductLotAssistantResult)
def product_lot_assistant(data: schemas.ProductLotAssistantRequest, db: Session = Depends(get_db)):
    return service.product_lot_assistant(db, data)
