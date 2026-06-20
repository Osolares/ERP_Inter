from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.domains.multimedia import models, schemas
from app.domains.inventory.models import Product, Lot

DEFAULT_COMPANY_ID = 1

def seed_label_templates(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    existing = db.scalar(select(func.count(models.LabelTemplate.id)).where(models.LabelTemplate.company_id == company_id)) or 0
    if existing:
        return
    defaults = [
        dict(code='LOT_80MM', name='Etiqueta lote 80mm', template_type='lot', paper_size='ticket_80mm', width_mm=80, height_mm=50, is_default=True,
             body_template='<div class="label"><b>{{nombre}}</b><br>SKU: {{sku}}<br>Lote: {{lote}}<br>QR: {{qr}}<br>BAR: {{barcode}}<br>{{precio}} · {{ubicacion}}</div>'),
        dict(code='PRODUCT_CARTA', name='Ficha producto carta', template_type='product', paper_size='carta', width_mm=216, height_mm=279, is_default=False,
             body_template='<h2>{{nombre}}</h2><p>SKU: {{sku}}</p><p>Precio: {{precio}}</p><p>{{qr}}</p>'),
        dict(code='MOTOR_GRANDE', name='Etiqueta motor grande', template_type='lot', paper_size='media_carta', width_mm=140, height_mm=100, is_default=False,
             body_template='<div class="label big"><h3>{{nombre}}</h3><p>Lote: {{lote}}</p><p>Motor: {{barcode}}</p><p>{{ubicacion}}</p></div>'),
    ]
    for item in defaults:
        db.add(models.LabelTemplate(company_id=company_id, variables='sku,nombre,lote,qr,barcode,precio,ubicacion', is_active=True, **item))
    db.commit()

def overview(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    seed_label_templates(db, company_id)
    total = db.scalar(select(func.count(models.MediaAsset.id)).where(models.MediaAsset.company_id == company_id, models.MediaAsset.is_deleted == False)) or 0
    images = db.scalar(select(func.count(models.MediaAsset.id)).where(models.MediaAsset.company_id == company_id, models.MediaAsset.is_deleted == False, models.MediaAsset.asset_type == 'image')) or 0
    docs = db.scalar(select(func.count(models.MediaAsset.id)).where(models.MediaAsset.company_id == company_id, models.MediaAsset.is_deleted == False, models.MediaAsset.asset_type != 'image')) or 0
    primary = db.scalar(select(func.count(models.MediaAsset.id)).where(models.MediaAsset.company_id == company_id, models.MediaAsset.is_deleted == False, models.MediaAsset.is_primary == True)) or 0
    trash = db.scalar(select(func.count(models.MediaAsset.id)).where(models.MediaAsset.company_id == company_id, models.MediaAsset.is_deleted == True)) or 0
    templates = db.scalar(select(func.count(models.LabelTemplate.id)).where(models.LabelTemplate.company_id == company_id, models.LabelTemplate.is_deleted == False)) or 0
    return schemas.MultimediaOverview(total_assets=total, images=images, documents=docs, primary_assets=primary, trash=trash, templates=templates, supported_targets=['product','lot','document','customer','supplier','company'])

def list_assets(db: Session, target_type: str | None = None, target_id: int | None = None, include_deleted: bool = False, company_id: int = DEFAULT_COMPANY_ID):
    q = select(models.MediaAsset).where(models.MediaAsset.company_id == company_id)
    if target_type:
        q = q.where(models.MediaAsset.target_type == target_type)
    if target_id is not None:
        q = q.where(models.MediaAsset.target_id == target_id)
    if not include_deleted:
        q = q.where(models.MediaAsset.is_deleted == False)
    return db.execute(q.order_by(models.MediaAsset.is_primary.desc(), models.MediaAsset.sort_order.asc(), models.MediaAsset.id.desc())).scalars().all()

def create_asset(db: Session, data: schemas.MediaAssetCreate, company_id: int = DEFAULT_COMPANY_ID):
    asset = models.MediaAsset(company_id=company_id, uploaded_by='Sistema', **data.model_dump())
    db.add(asset)
    db.flush()
    if asset.is_primary:
        set_primary(db, asset.id, company_id, commit=False)
    db.commit(); db.refresh(asset)
    return asset

def update_asset(db: Session, asset_id: int, data: schemas.MediaAssetUpdate, company_id: int = DEFAULT_COMPANY_ID):
    asset = db.get(models.MediaAsset, asset_id)
    if not asset or asset.company_id != company_id:
        raise ValueError('Archivo no encontrado')
    payload = data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(asset, key, value)
    asset.updated_at = datetime.now(timezone.utc)
    if payload.get('is_primary') is True:
        set_primary(db, asset.id, company_id, commit=False)
    db.commit(); db.refresh(asset)
    return asset

def set_primary(db: Session, asset_id: int, company_id: int = DEFAULT_COMPANY_ID, commit: bool = True):
    asset = db.get(models.MediaAsset, asset_id)
    if not asset or asset.company_id != company_id:
        raise ValueError('Archivo no encontrado')
    siblings = db.execute(select(models.MediaAsset).where(models.MediaAsset.company_id == company_id, models.MediaAsset.target_type == asset.target_type, models.MediaAsset.target_id == asset.target_id, models.MediaAsset.is_deleted == False)).scalars().all()
    for item in siblings:
        item.is_primary = (item.id == asset.id)
    if commit:
        db.commit(); db.refresh(asset)
    return asset

def trash_asset(db: Session, asset_id: int, company_id: int = DEFAULT_COMPANY_ID):
    asset = db.get(models.MediaAsset, asset_id)
    if not asset or asset.company_id != company_id:
        raise ValueError('Archivo no encontrado')
    asset.is_deleted = True; asset.is_active = False; asset.deleted_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(asset)
    return asset

def restore_asset(db: Session, asset_id: int, company_id: int = DEFAULT_COMPANY_ID):
    asset = db.get(models.MediaAsset, asset_id)
    if not asset or asset.company_id != company_id:
        raise ValueError('Archivo no encontrado')
    asset.is_deleted = False; asset.is_active = True; asset.deleted_at = None
    db.commit(); db.refresh(asset)
    return asset

def list_templates(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    seed_label_templates(db, company_id)
    return db.execute(select(models.LabelTemplate).where(models.LabelTemplate.company_id == company_id, models.LabelTemplate.is_deleted == False).order_by(models.LabelTemplate.is_default.desc(), models.LabelTemplate.name.asc())).scalars().all()

def qr_barcode(db: Session, target_type: str, target_id: int, company_id: int = DEFAULT_COMPANY_ID):
    label_hint = 'Registro ERP'
    code = f'{target_type.upper()}-{target_id}'
    if target_type == 'product':
        product = db.get(Product, target_id)
        if product:
            code = product.sku or code
            label_hint = product.name
    elif target_type == 'lot':
        lot = db.get(Lot, target_id)
        if lot:
            code = lot.lot_code or code
            label_hint = f'Lote {lot.lot_code}'
    qr_value = f'erp://intermotores/{target_type}/{target_id}'
    return schemas.QrBarcodeResponse(target_type=target_type, target_id=target_id, qr_value=qr_value, barcode_value=code, label_hint=label_hint)

def label_preview(db: Session, data: schemas.LabelPreviewRequest, company_id: int = DEFAULT_COMPANY_ID):
    seed_label_templates(db, company_id)
    template = db.execute(select(models.LabelTemplate).where(models.LabelTemplate.company_id == company_id, models.LabelTemplate.code == data.template_code)).scalar_one_or_none()
    if not template:
        template = db.execute(select(models.LabelTemplate).where(models.LabelTemplate.company_id == company_id, models.LabelTemplate.is_default == True)).scalar_one()
    qr_value = data.qr_value or f'erp://intermotores/{data.target_type}/{data.target_id}'
    barcode_value = data.barcode or (data.lot_code or data.sku or f'{data.target_type.upper()}-{data.target_id}')
    values = {'sku': data.sku or 'SKU-PENDIENTE', 'nombre': data.name or 'Producto/Lote', 'lote': data.lot_code or 'LOTE-PENDIENTE', 'qr': qr_value, 'barcode': barcode_value, 'precio': data.price or 'Q 0.00', 'ubicacion': data.location or 'CENTRAL'}
    html = template.body_template
    used = []
    for key, value in values.items():
        marker = '{{' + key + '}}'
        if marker in html:
            used.append(key)
        html = html.replace(marker, str(value))
    return schemas.LabelPreviewResponse(template_code=template.code, html=html, variables_used=used, qr_value=qr_value, barcode_value=barcode_value)
