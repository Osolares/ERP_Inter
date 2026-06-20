from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.multimedia import schemas, service

router = APIRouter(prefix='/multimedia', tags=['multimedia'])

@router.get('/overview', response_model=schemas.MultimediaOverview)
def get_overview(db: Session = Depends(get_db)):
    return service.overview(db)

@router.get('/assets', response_model=list[schemas.MediaAssetRead])
def get_assets(target_type: str | None = None, target_id: int | None = None, include_deleted: bool = False, db: Session = Depends(get_db)):
    return service.list_assets(db, target_type, target_id, include_deleted)

@router.post('/assets', response_model=schemas.MediaAssetRead)
def create_asset(data: schemas.MediaAssetCreate, db: Session = Depends(get_db)):
    return service.create_asset(db, data)

@router.put('/assets/{asset_id}', response_model=schemas.MediaAssetRead)
def update_asset(asset_id: int, data: schemas.MediaAssetUpdate, db: Session = Depends(get_db)):
    try:
        return service.update_asset(db, asset_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.post('/assets/{asset_id}/primary', response_model=schemas.MediaAssetRead)
def set_primary(asset_id: int, db: Session = Depends(get_db)):
    try:
        return service.set_primary(db, asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.post('/assets/{asset_id}/trash', response_model=schemas.MediaAssetRead)
def trash_asset(asset_id: int, db: Session = Depends(get_db)):
    try:
        return service.trash_asset(db, asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.post('/assets/{asset_id}/restore', response_model=schemas.MediaAssetRead)
def restore_asset(asset_id: int, db: Session = Depends(get_db)):
    try:
        return service.restore_asset(db, asset_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get('/templates', response_model=list[schemas.LabelTemplateRead])
def templates(db: Session = Depends(get_db)):
    return service.list_templates(db)

@router.get('/qr-barcode', response_model=schemas.QrBarcodeResponse)
def qr_barcode(target_type: str, target_id: int, db: Session = Depends(get_db)):
    return service.qr_barcode(db, target_type, target_id)

@router.post('/label-preview', response_model=schemas.LabelPreviewResponse)
def label_preview(data: schemas.LabelPreviewRequest, db: Session = Depends(get_db)):
    return service.label_preview(db, data)
