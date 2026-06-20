from decimal import Decimal
import csv
import io
from datetime import timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.domains.inventory import models

DEFAULT_COMPANY_ID = 1


def ensure_default_warehouse(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    """Garantiza una bodega operativa por defecto para evitar errores técnicos en lotes.

    En Intermotores v14 la bodega CENTRAL es el valor inicial configurable.
    Si no existe ninguna bodega activa para la empresa, se crea automáticamente.
    """
    existing_default = db.execute(
        select(models.Warehouse).where(
            models.Warehouse.company_id == company_id,
            models.Warehouse.is_deleted == False,
            models.Warehouse.is_active == True,
            models.Warehouse.is_default == True,
        ).order_by(models.Warehouse.id.asc())
    ).scalar_one_or_none()
    if existing_default:
        return existing_default

    first_active = db.execute(
        select(models.Warehouse).where(
            models.Warehouse.company_id == company_id,
            models.Warehouse.is_deleted == False,
            models.Warehouse.is_active == True,
        ).order_by(models.Warehouse.id.asc())
    ).scalar_one_or_none()
    if first_active:
        first_active.is_default = True
        db.commit(); db.refresh(first_active)
        return first_active

    central = models.Warehouse(
        company_id=company_id,
        code='CENTRAL',
        name='Bodega Central',
        location='Intermotores',
        is_default=True,
        is_active=True,
    )
    db.add(central)
    db.commit(); db.refresh(central)
    return central



def catalog_overview(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    ensure_default_warehouse(db, company_id)
    categories = db.scalar(select(func.count(models.Category.id)).where(models.Category.company_id == company_id, models.Category.is_deleted == False)) or 0
    brands = db.scalar(select(func.count(models.Brand.id)).where(models.Brand.company_id == company_id, models.Brand.is_deleted == False)) or 0
    characteristics = db.scalar(select(func.count(models.Characteristic.id)).where(models.Characteristic.company_id == company_id, models.Characteristic.is_deleted == False)) or 0
    engine_series = db.scalar(select(func.count(models.EngineSeries.id)).where(models.EngineSeries.company_id == company_id, models.EngineSeries.is_deleted == False)) or 0
    warehouses = db.scalar(select(func.count(models.Warehouse.id)).where(models.Warehouse.company_id == company_id, models.Warehouse.is_deleted == False)) or 0
    vehicle_models = db.scalar(select(func.count(models.VehicleModel.id)).where(models.VehicleModel.company_id == company_id, models.VehicleModel.is_deleted == False)) or 0
    deleted_items = 0
    for deleted_model in [models.Category, models.Brand, models.Characteristic, models.EngineSeries, models.Warehouse, models.VehicleModel]:
        deleted_items += db.scalar(select(func.count(deleted_model.id)).where(deleted_model.company_id == company_id, deleted_model.is_deleted == True)) or 0
    automation_ready_series = db.scalar(select(func.count(models.EngineSeries.id)).where(models.EngineSeries.company_id == company_id, models.EngineSeries.is_deleted == False, models.EngineSeries.sku_prefix != '')) or 0
    categories_with_rules = db.scalar(select(func.count(models.Category.id)).where(models.Category.company_id == company_id, models.Category.is_deleted == False, ((models.Category.requires_engine_series == True) | (models.Category.sku_prefix != '')))) or 0
    return {
        'categories': categories,
        'brands': brands,
        'characteristics': characteristics,
        'engine_series': engine_series,
        'warehouses': warehouses,
        'vehicle_models': vehicle_models,
        'deleted_items': deleted_items,
        'automation_ready_series': automation_ready_series,
        'categories_with_rules': categories_with_rules,
    }


def seed_default_catalogs(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    ensure_default_warehouse(db, company_id)
    def exists(model, **filters):
        q = select(model).where(model.company_id == company_id, model.is_deleted == False)
        for key, value in filters.items():
            q = q.where(getattr(model, key) == value)
        return db.execute(q).scalar_one_or_none()

    defaults_categories = [
        dict(name='Motor', category_kind='principal', sku_prefix='mot', requires_engine_series=True, handles_inventory=True, description='Categoría principal para motores completos.'),
        dict(name='Repuesto', category_kind='principal', sku_prefix='rep', requires_engine_series=True, handles_inventory=True, description='Categoría principal para repuestos automotrices.'),
        dict(name='Servicio', category_kind='principal', sku_prefix='srv', requires_engine_series=False, handles_inventory=False, description='Servicios/no inventariables.'),
        dict(name='Culata', category_kind='producto', sku_prefix='cul', requires_engine_series=True, handles_inventory=True, description='Categoría de producto para culatas.'),
        dict(name='Turbo', category_kind='producto', sku_prefix='tur', requires_engine_series=True, handles_inventory=True, description='Categoría de producto para turbos.'),
    ]
    for data in defaults_categories:
        if not exists(models.Category, name=data['name']):
            db.add(models.Category(company_id=company_id, is_active=True, **data))

    for name in ['Hyundai', 'Kia', 'Mitsubishi', 'Toyota', 'Honda', 'Mazda']:
        if not exists(models.Brand, name=name):
            db.add(models.Brand(company_id=company_id, name=name, is_active=True))
    db.flush()

    # Modelos/líneas base para probar selectores y compatibilidades sin crear CRUDs aislados.
    brand_by_name = {b.name: b for b in db.execute(select(models.Brand).where(models.Brand.company_id == company_id, models.Brand.is_deleted == False)).scalars().all()}
    default_models = [('Hyundai', 'Santa Fe'), ('Hyundai', 'H1'), ('Kia', 'Sorento'), ('Mitsubishi', 'L200'), ('Toyota', 'Hilux'), ('Honda', 'CR-V')]
    for brand_name, model_name in default_models:
        brand = brand_by_name.get(brand_name)
        if brand and not exists(models.VehicleModel, brand_id=brand.id, name=model_name):
            db.add(models.VehicleModel(company_id=company_id, brand_id=brand.id, name=model_name, is_active=True))

    default_characteristics = [
        ('Turbo', 'Producto con turbo.'), ('Intercooler', 'Con intercooler.'), ('Completo', 'Producto completo.'),
        ('Original', 'Original/OEM.'), ('Aftermarket', 'Reemplazo aftermarket.'), ('Automático', 'Para transmisión automática.'),
        ('Manual', 'Para transmisión manual.'), ('Con garantía', 'Aplica garantía comercial.'),
    ]
    for name, description in default_characteristics:
        if not exists(models.Characteristic, name=name):
            db.add(models.Characteristic(company_id=company_id, name=name, description=description, is_active=True))

    default_series = [
        dict(code='D4EA', name='D4EA', brand_name='Hyundai/Kia', fuel_type='Diésel', displacement_cc='2000', cylinders='4', equivalent_series='D4EA-R', sku_prefix='d4ea'),
        dict(code='D4CB', name='D4CB', brand_name='Hyundai/Kia', fuel_type='Diésel', displacement_cc='2500', cylinders='4', equivalent_series='', sku_prefix='d4cb'),
        dict(code='4D56', name='4D56', brand_name='Mitsubishi', fuel_type='Diésel', displacement_cc='2500', cylinders='4', equivalent_series='4D56T', sku_prefix='4d56'),
        dict(code='4M40', name='4M40', brand_name='Mitsubishi', fuel_type='Diésel', displacement_cc='2800', cylinders='4', equivalent_series='', sku_prefix='4m40'),
        dict(code='3L', name='3L', brand_name='Toyota', fuel_type='Diésel', displacement_cc='2800', cylinders='4', equivalent_series='', sku_prefix='3l'),
        dict(code='5L', name='5L', brand_name='Toyota', fuel_type='Diésel', displacement_cc='3000', cylinders='4', equivalent_series='', sku_prefix='5l'),
    ]
    for data in default_series:
        if not exists(models.EngineSeries, code=data['code']):
            db.add(models.EngineSeries(company_id=company_id, is_active=True, **data))

    db.commit()
    return catalog_overview(db, company_id)


def engine_series_automation(db: Session, series_id: int, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.EngineSeries, series_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    return {
        'source': 'engine_series', 'source_id': item.id, 'brand_name': item.brand_name, 'fuel_type': item.fuel_type,
        'displacement_cc': item.displacement_cc, 'cylinders': item.cylinders, 'equivalent_series': item.equivalent_series,
        'sku_prefix': item.sku_prefix, 'requires_engine_series': False, 'handles_inventory': True,
        'product_type_suggestion': 'repuesto', 'notes': 'Autocompletado desde serie motor. Puedes editar los campos si el caso lo requiere.'
    }


def category_automation(db: Session, category_id: int, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.Category, category_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    product_type = 'motor' if item.name.lower() == 'motor' else ('servicio' if not item.handles_inventory else 'repuesto')
    return {
        'source': 'category', 'source_id': item.id, 'brand_name': '', 'fuel_type': '', 'displacement_cc': '', 'cylinders': '',
        'equivalent_series': '', 'sku_prefix': item.sku_prefix, 'requires_engine_series': item.requires_engine_series,
        'handles_inventory': item.handles_inventory, 'product_type_suggestion': product_type,
        'notes': 'Reglas sugeridas desde categoría. La configuración central será la fuente de verdad.'
    }

def soft_delete_catalog_item(db: Session, catalog_type: str, item_id: int, company_id: int = DEFAULT_COMPANY_ID):
    model_map = {'categories': models.Category, 'brands': models.Brand, 'characteristics': models.Characteristic, 'engine-series': models.EngineSeries, 'warehouses': models.Warehouse, 'vehicle-models': models.VehicleModel}
    model = model_map.get(catalog_type)
    if model is None:
        raise ValueError('Tipo de catálogo no soportado.')
    item = db.get(model, item_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    item.is_deleted = True
    db.commit(); db.refresh(item); return item



def list_catalog_trash(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    specs = [
        ('categories', 'Categoría', models.Category, lambda x: (x.name, f'{x.category_kind} · prefijo {x.sku_prefix or "—"}')),
        ('brands', 'Marca', models.Brand, lambda x: (x.name, 'Marca / fabricante')),
        ('engine-series', 'Serie motor', models.EngineSeries, lambda x: (x.code, f'{x.brand_name or "sin marca"} · {x.fuel_type or "sin combustible"}')),
        ('characteristics', 'Característica', models.Characteristic, lambda x: (x.name, x.description or 'Sin descripción')),
        ('warehouses', 'Bodega', models.Warehouse, lambda x: (x.code, x.name)),
        ('vehicle-models', 'Modelo/Línea', models.VehicleModel, lambda x: (x.name, f'Marca ID {x.brand_id}')),
    ]
    rows = []
    for catalog_type, label, model, mapper in specs:
        items = db.execute(select(model).where(model.company_id == company_id, model.is_deleted == True).order_by(model.id.desc())).scalars().all()
        for item in items:
            title, subtitle = mapper(item)
            rows.append({'catalog_type': catalog_type, 'catalog_label': label, 'id': item.id, 'title': title, 'subtitle': subtitle})
    return rows


def restore_catalog_item(db: Session, catalog_type: str, item_id: int, company_id: int = DEFAULT_COMPANY_ID):
    model_map = {'categories': models.Category, 'brands': models.Brand, 'characteristics': models.Characteristic, 'engine-series': models.EngineSeries, 'warehouses': models.Warehouse, 'vehicle-models': models.VehicleModel}
    model = model_map.get(catalog_type)
    if model is None:
        raise ValueError('Tipo de catálogo no soportado.')
    item = db.get(model, item_id)
    if item is None or item.company_id != company_id:
        return None
    item.is_deleted = False
    item.is_active = True
    db.commit(); db.refresh(item); return item


def import_catalog_csv(db: Session, catalog_type: str, csv_text: str, company_id: int = DEFAULT_COMPANY_ID):
    imported = 0; skipped = 0; errors = []
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    if not reader.fieldnames:
        return {'imported': 0, 'skipped': 0, 'errors': ['El CSV no tiene encabezados.']}
    def norm(row, key, default=''):
        return (row.get(key) or row.get(key.upper()) or row.get(key.capitalize()) or default).strip()
    for idx, row in enumerate(reader, start=2):
        try:
            if catalog_type == 'brands':
                name = norm(row, 'name') or norm(row, 'nombre')
                if not name: skipped += 1; continue
                exists_item = db.execute(select(models.Brand).where(models.Brand.company_id == company_id, models.Brand.name == name, models.Brand.is_deleted == False)).scalar_one_or_none()
                if exists_item: skipped += 1; continue
                db.add(models.Brand(company_id=company_id, name=name, is_active=True)); imported += 1
            elif catalog_type == 'categories':
                name = norm(row, 'name') or norm(row, 'nombre')
                if not name: skipped += 1; continue
                exists_item = db.execute(select(models.Category).where(models.Category.company_id == company_id, models.Category.name == name, models.Category.is_deleted == False)).scalar_one_or_none()
                if exists_item: skipped += 1; continue
                db.add(models.Category(company_id=company_id, name=name, category_kind=norm(row, 'category_kind', 'producto'), sku_prefix=norm(row, 'sku_prefix'), requires_engine_series=(norm(row, 'requires_engine_series').lower() in ['1','true','si','sí','yes']), handles_inventory=(norm(row, 'handles_inventory', 'true').lower() not in ['0','false','no']), description=norm(row, 'description'), is_active=True)); imported += 1
            elif catalog_type == 'engine-series':
                code = norm(row, 'code') or norm(row, 'codigo') or norm(row, 'código')
                if not code: skipped += 1; continue
                exists_item = db.execute(select(models.EngineSeries).where(models.EngineSeries.company_id == company_id, models.EngineSeries.code == code, models.EngineSeries.is_deleted == False)).scalar_one_or_none()
                if exists_item: skipped += 1; continue
                db.add(models.EngineSeries(company_id=company_id, code=code, name=norm(row, 'name') or code, brand_name=norm(row, 'brand_name') or norm(row, 'marca'), fuel_type=norm(row, 'fuel_type') or norm(row, 'combustible'), displacement_cc=norm(row, 'displacement_cc') or norm(row, 'cc'), cylinders=norm(row, 'cylinders') or norm(row, 'cilindros'), equivalent_series=norm(row, 'equivalent_series') or norm(row, 'equivalentes'), sku_prefix=norm(row, 'sku_prefix'), is_active=True)); imported += 1
            elif catalog_type == 'characteristics':
                name = norm(row, 'name') or norm(row, 'nombre')
                if not name: skipped += 1; continue
                exists_item = db.execute(select(models.Characteristic).where(models.Characteristic.company_id == company_id, models.Characteristic.name == name, models.Characteristic.is_deleted == False)).scalar_one_or_none()
                if exists_item: skipped += 1; continue
                db.add(models.Characteristic(company_id=company_id, name=name, description=norm(row, 'description') or norm(row, 'descripcion') or norm(row, 'descripción'), is_active=True)); imported += 1
            else:
                errors.append(f'Fila {idx}: tipo de catálogo no soportado para importación.'); skipped += 1
        except Exception as exc:
            errors.append(f'Fila {idx}: {exc}'); skipped += 1
    db.commit()
    return {'imported': imported, 'skipped': skipped, 'errors': errors[:20]}

def list_records(db: Session, model, company_id: int = DEFAULT_COMPANY_ID):
    if model is models.Warehouse:
        ensure_default_warehouse(db, company_id)
    return db.execute(select(model).where(model.company_id == company_id, model.is_deleted == False).order_by(model.id.desc())).scalars().all()

def _singularize_es(name: str) -> str:
    value = (name or '').strip()
    if not value:
        return ''
    lower = value.lower()
    if lower.endswith('es') and len(value) > 4:
        return value[:-2]
    if lower.endswith('s') and len(value) > 3:
        return value[:-1]
    return value


def create_category(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    values['sku_prefix'] = (values.get('sku_prefix') or '').strip().upper()
    if not values.get('singular_name'):
        values['singular_name'] = _singularize_es(values.get('name') or '')
    item = models.Category(company_id=company_id, **values)
    db.add(item); db.commit(); db.refresh(item); return item


def update_category(db: Session, category_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.Category, category_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    values = data.model_dump()
    values['sku_prefix'] = (values.get('sku_prefix') or '').strip().upper()
    if not values.get('singular_name'):
        values['singular_name'] = _singularize_es(values.get('name') or '')
    for key, value in values.items():
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item


def create_catalog_value(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    values['catalog_type'] = (values.get('catalog_type') or '').strip().lower()
    item = models.CatalogValue(company_id=company_id, **values)
    db.add(item); db.commit(); db.refresh(item); return item


def update_catalog_value(db: Session, value_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.CatalogValue, value_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    for key, value in data.model_dump().items():
        if key == 'catalog_type' and isinstance(value, str): value = value.lower().strip()
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item


def create_brand(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    item = models.Brand(company_id=company_id, **data.model_dump())
    db.add(item); db.commit(); db.refresh(item); return item


def update_simple_record(db: Session, model, item_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(model, item_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item


def create_vehicle_model(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    brand = db.get(models.Brand, values.get('brand_id'))
    if brand is None or brand.company_id != company_id or brand.is_deleted:
        raise ValueError('La marca seleccionada para el modelo/línea no existe o no está activa.')
    item = models.VehicleModel(company_id=company_id, **values)
    db.add(item); db.commit(); db.refresh(item); return item

def create_characteristic(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    item = models.Characteristic(company_id=company_id, **data.model_dump())
    db.add(item); db.commit(); db.refresh(item); return item

def create_engine_series(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    item = models.EngineSeries(company_id=company_id, **data.model_dump())
    db.add(item); db.commit(); db.refresh(item); return item

def create_warehouse(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    item = models.Warehouse(company_id=company_id, **data.model_dump())
    db.add(item); db.commit(); db.refresh(item); return item

def create_product(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    # Compatibilidad temporal: si aún viene category_id, se usa también como categoría de producto.
    if values.get('category_id') and not values.get('product_category_id'):
        values['product_category_id'] = values['category_id']
    if values.get('product_category_id') and not values.get('category_id'):
        values['category_id'] = values['product_category_id']
    item = models.Product(company_id=company_id, **values)
    db.add(item); db.commit(); db.refresh(item); return item


def generate_lot_code(db: Session, product_id: int, company_id: int = DEFAULT_COMPANY_ID):
    product = db.get(models.Product, product_id)
    if product is None or product.company_id != company_id or product.is_deleted:
        raise ValueError('Producto no encontrado para generar código de lote.')
    prefix = ''
    category = None
    if product.product_category_id:
        category = db.get(models.Category, product.product_category_id)
    if not category and product.category_id:
        category = db.get(models.Category, product.category_id)
    if category and category.sku_prefix:
        prefix = category.sku_prefix.upper().strip()
    elif category and category.name:
        prefix = category.name[:3].upper().strip()
    elif product.sku:
        prefix = product.sku[:3].upper().strip()
    else:
        prefix = 'LOT'
    prefix = ''.join(ch for ch in prefix if ch.isalnum())[:6] or 'LOT'
    like_pattern = f'{prefix}-%'
    existing = db.execute(
        select(models.Lot.lot_code).where(
            models.Lot.company_id == company_id,
            models.Lot.lot_code.ilike(like_pattern)
        )
    ).scalars().all()
    max_number = 0
    for code in existing:
        try:
            suffix = str(code).split('-')[-1]
            max_number = max(max_number, int(suffix))
        except Exception:
            continue
    return f'{prefix}-{max_number + 1:05d}'


def lot_code_preview(db: Session, product_id: int, company_id: int = DEFAULT_COMPANY_ID):
    code = generate_lot_code(db, product_id, company_id)
    prefix = code.split('-')[0]
    return {'product_id': product_id, 'prefix': prefix, 'next_code': code, 'format': f'{prefix}-00001'}



def _is_motor_product(db: Session, product_id: int, company_id: int = DEFAULT_COMPANY_ID) -> bool:
    product = db.get(models.Product, product_id)
    if product is None or product.company_id != company_id or product.is_deleted:
        raise ValueError('Producto no encontrado para lote.')
    category_name = ''
    if product.main_category_id:
        cat = db.get(models.Category, product.main_category_id)
        category_name = (cat.name if cat else '') or ''
    return (product.product_type or '').lower() == 'motor' or 'motor' in category_name.lower()


def _normalize_lot_traceability(db: Session, values: dict, company_id: int = DEFAULT_COMPANY_ID, current_lot_id: int | None = None) -> dict:
    values['lot_code'] = (values.get('lot_code') or '').strip().upper()
    if not values.get('barcode') and values.get('lot_code'):
        values['barcode'] = values['lot_code']
    if not values.get('qr_code') and values.get('lot_code'):
        values['qr_code'] = f"ERP:LOT:{values['lot_code']}"
    if values.get('product_id') and _is_motor_product(db, int(values['product_id']), company_id):
        engine_number = (values.get('engine_number') or '').strip()
        if not engine_number:
            raise ValueError('El número de motor es obligatorio para productos de categoría Motor.')
        duplicate = db.execute(select(models.Lot).where(
            models.Lot.company_id == company_id,
            models.Lot.is_deleted == False,
            models.Lot.engine_number == engine_number
        )).scalar_one_or_none()
        if duplicate is not None and duplicate.id != current_lot_id:
            raise ValueError('El número de motor ya existe en otro lote.')
        values['engine_number'] = engine_number
    return values

def create_lot(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    # La condición del lote no se edita aquí; se hereda conceptualmente del producto maestro.
    values.pop('condition', None)
    if not values.get('lot_code'):
        values['lot_code'] = generate_lot_code(db, int(values.get('product_id')), company_id)
    values = _normalize_lot_traceability(db, values, company_id)
    purchase_id = values.get('purchase_id')
    if purchase_id:
        purchase = db.get(models.Purchase, purchase_id)
        if purchase and purchase.company_id == company_id and not purchase.is_deleted:
            values['supplier_name'] = values.get('supplier_name') or purchase.supplier_name
            values['supplier_tax_id'] = values.get('supplier_tax_id') or purchase.supplier_tax_id
            values['purchase_document_reference'] = values.get('purchase_document_reference') or purchase.document_reference or purchase.purchase_code
            values['purchase_date'] = values.get('purchase_date') or (purchase.created_at.astimezone(timezone.utc).date().isoformat() if purchase.created_at else '')
    warehouse_id = values.get('warehouse_id')
    if not warehouse_id:
        values['warehouse_id'] = ensure_default_warehouse(db, company_id).id
    else:
        wh = db.get(models.Warehouse, warehouse_id)
        if wh is None or wh.company_id != company_id or wh.is_deleted:
            values['warehouse_id'] = ensure_default_warehouse(db, company_id).id
    qty_initial = Decimal(str(values.pop('quantity_initial') or '0'))
    physical_initial = values.pop('physical_initial_qty')
    accounting_initial = values.pop('accounting_initial_qty')
    physical_qty = Decimal(str(physical_initial if physical_initial is not None else qty_initial))
    out_accounting = bool(values.get('is_out_of_accounting_inventory'))
    accounting_qty = Decimal('0') if out_accounting else Decimal(str(accounting_initial if accounting_initial is not None else qty_initial))
    unit_cost = Decimal(str(values.get('unit_cost') or '0'))
    total_cost = unit_cost * physical_qty
    item = models.Lot(
        company_id=company_id,
        quantity_initial=qty_initial,
        quantity_available=physical_qty,
        physical_initial_qty=physical_qty,
        physical_qty=physical_qty,
        accounting_initial_qty=accounting_qty,
        accounting_qty=accounting_qty,
        original_cost=total_cost,
        pending_cost_to_distribute=total_cost,
        **values
    )
    db.add(item)
    db.flush()
    movement = models.KardexMovement(
        company_id=company_id,
        product_id=item.product_id,
        lot_id=item.id,
        warehouse_id=item.warehouse_id,
        movement_type='entrada',
        reference_type='lote_inicial',
        reference_id=str(item.id),
        affects_physical=True,
        affects_accounting=not out_accounting,
        quantity=physical_qty,
        unit_cost=item.unit_cost,
        physical_balance_after=physical_qty,
        accounting_balance_after=accounting_qty,
        balance_after=physical_qty,
        notes='Entrada inicial generada al crear lote. Costo registrado con IVA incluido.'
    )
    db.add(movement)
    db.commit(); db.refresh(item); return item


def update_lot(db: Session, lot_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.Lot, lot_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    values = data.model_dump()
    values.pop('condition', None)
    if not values.get('lot_code'):
        values['lot_code'] = item.lot_code
    values = _normalize_lot_traceability(db, values, company_id, current_lot_id=item.id)
    if not values.get('warehouse_id'):
        values['warehouse_id'] = ensure_default_warehouse(db, company_id).id
    # En edición no reescribimos saldos por cantidad inicial; solo datos maestros/controlados.
    # Las existencias reales se modifican por documentos/movimientos; para esta fase permitimos
    # corregir datos descriptivos y banderas operativas del lote.
    for key, value in values.items():
        if key in {'quantity_initial', 'physical_initial_qty', 'accounting_initial_qty'}:
            continue
        setattr(item, key, value)
    # Si se marca fuera de inventario contable, se protege la cantidad contable en cero para lotes nuevos/editados.
    if item.is_out_of_accounting_inventory and item.accounting_qty != 0:
        old_accounting = item.accounting_qty
        item.accounting_qty = Decimal('0')
        item.accounting_initial_qty = Decimal('0')
        movement = models.KardexMovement(
            company_id=company_id, product_id=item.product_id, lot_id=item.id, warehouse_id=item.warehouse_id,
            movement_type='regularizacion', reference_type='lote_fuera_contable', reference_id=str(item.id),
            affects_physical=False, affects_accounting=True, quantity=old_accounting * Decimal('-1'), unit_cost=item.unit_cost,
            physical_balance_after=item.physical_qty, accounting_balance_after=item.accounting_qty, balance_after=item.physical_qty,
            notes='Regularización automática: lote marcado fuera de inventario contable.'
        )
        db.add(movement)
    item.quantity_available = item.physical_qty
    db.commit(); db.refresh(item); return item

def soft_delete_lot(db: Session, lot_id: int, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.Lot, lot_id)
    if item is None or item.company_id != company_id or item.is_deleted:
        return None
    if Decimal(str(item.physical_qty or 0)) != 0 or Decimal(str(item.accounting_qty or 0)) != 0:
        raise ValueError('No se puede enviar a papelera un lote con existencia física o contable. Primero debe regularizarse mediante documento.')
    item.is_deleted = True
    db.commit(); db.refresh(item); return item

def list_kardex(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(select(models.KardexMovement).where(models.KardexMovement.company_id == company_id).order_by(models.KardexMovement.id.desc())).scalars().all()

def summary(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    ensure_default_warehouse(db, company_id)
    products = db.scalar(select(func.count(models.Product.id)).where(models.Product.company_id == company_id, models.Product.is_deleted == False)) or 0
    lots = db.scalar(select(func.count(models.Lot.id)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or 0
    warehouses = db.scalar(select(func.count(models.Warehouse.id)).where(models.Warehouse.company_id == company_id, models.Warehouse.is_deleted == False)) or 0
    physical = db.scalar(select(func.coalesce(func.sum(models.Lot.physical_qty), 0)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or Decimal('0')
    accounting = db.scalar(select(func.coalesce(func.sum(models.Lot.accounting_qty), 0)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or Decimal('0')
    reserved = db.scalar(select(func.coalesce(func.sum(models.Lot.reserved_qty), 0)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or Decimal('0')
    pending_exit = db.scalar(select(func.coalesce(func.sum(models.Lot.pending_exit_qty), 0)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or Decimal('0')
    blocked = db.scalar(select(func.coalesce(func.sum(models.Lot.blocked_qty), 0)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False)) or Decimal('0')
    out_acc = db.scalar(select(func.count(models.Lot.id)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False, models.Lot.is_out_of_accounting_inventory == True)) or 0
    disassemblable = db.scalar(select(func.count(models.Lot.id)).where(models.Lot.company_id == company_id, models.Lot.is_deleted == False, models.Lot.is_disassemblable == True)) or 0
    return {
        'products': products,
        'lots': lots,
        'warehouses': warehouses,
        'physical_units': physical,
        'accounting_units': accounting,
        'available_physical': physical - reserved - blocked,
        'available_accounting': accounting - reserved - blocked,
        'out_accounting_lots': out_acc,
        'disassemblable_lots': disassemblable,
    }


def get_record(db: Session, model, item_id: int, company_id: int = DEFAULT_COMPANY_ID, include_deleted: bool = False):
    stmt = select(model).where(model.company_id == company_id, model.id == item_id)
    if not include_deleted:
        stmt = stmt.where(model.is_deleted == False)
    return db.execute(stmt).scalar_one_or_none()

def update_product(db: Session, product_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = get_record(db, models.Product, product_id, company_id)
    if item is None:
        return None
    values = data.model_dump()
    if values.get('category_id') and not values.get('product_category_id'):
        values['product_category_id'] = values['category_id']
    if values.get('product_category_id') and not values.get('category_id'):
        values['category_id'] = values['product_category_id']
    for key, value in values.items():
        setattr(item, key, value)
    db.commit(); db.refresh(item); return item

def soft_delete_product(db: Session, product_id: int, company_id: int = DEFAULT_COMPANY_ID):
    item = get_record(db, models.Product, product_id, company_id)
    if item is None:
        return None
    item.is_deleted = True
    item.is_active = False
    db.commit(); db.refresh(item); return item

def restore_product(db: Session, product_id: int, company_id: int = DEFAULT_COMPANY_ID):
    item = get_record(db, models.Product, product_id, company_id, include_deleted=True)
    if item is None:
        return None
    item.is_deleted = False
    item.deleted_at = None
    item.is_active = True
    db.commit(); db.refresh(item); return item

def list_deleted_products(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(select(models.Product).where(models.Product.company_id == company_id, models.Product.is_deleted == True).order_by(models.Product.id.desc())).scalars().all()


def list_warehouse_exits(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.WarehouseExit)
        .where(models.WarehouseExit.company_id == company_id, models.WarehouseExit.is_deleted == False)
        .order_by(models.WarehouseExit.id.desc())
    ).scalars().all()

def list_warehouse_exit_lines(db: Session, exit_id: int, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.WarehouseExitLine)
        .where(models.WarehouseExitLine.company_id == company_id, models.WarehouseExitLine.exit_id == exit_id)
        .order_by(models.WarehouseExitLine.id.asc())
    ).scalars().all()


def list_customers(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.Customer)
        .where(models.Customer.company_id == company_id, models.Customer.is_deleted == False)
        .order_by(models.Customer.id.desc())
    ).scalars().all()


def create_customer(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    name = (values.get('name') or '').strip()
    if not name:
        raise ValueError('El nombre del cliente es obligatorio.')
    tax_id = (values.get('tax_id') or 'CF').strip() or 'CF'
    existing = db.execute(
        select(models.Customer).where(
            models.Customer.company_id == company_id,
            models.Customer.tax_id == tax_id,
            models.Customer.is_deleted == False,
        )
    ).scalar_one_or_none()
    if existing:
        existing.name = name
        existing.contact_name = values.get('contact_name') or existing.contact_name or ''
        existing.phone = values.get('phone') or existing.phone or ''
        existing.email = values.get('email') or existing.email or ''
        existing.address = values.get('address') or existing.address or ''
        existing.price_type = values.get('price_type') or existing.price_type or 'normal'
        existing.discount_percent = values.get('discount_percent') or existing.discount_percent or 0
        existing.seller_name = values.get('seller_name') or existing.seller_name or ''
        existing.notes = values.get('notes') or existing.notes or ''
        db.commit(); db.refresh(existing); return existing
    customer = models.Customer(
        company_id=company_id,
        name=name,
        tax_id=tax_id,
        contact_name=values.get('contact_name') or '',
        phone=values.get('phone') or '',
        email=values.get('email') or '',
        address=values.get('address') or '',
        price_type=values.get('price_type') or 'normal',
        discount_percent=values.get('discount_percent') or 0,
        seller_name=values.get('seller_name') or '',
        notes=values.get('notes') or '',
        is_active=True,
    )
    db.add(customer); db.commit(); db.refresh(customer); return customer


def ensure_customer_from_document(db: Session, client_name: str, client_tax_id: str, company_id: int = DEFAULT_COMPANY_ID):
    name = (client_name or 'Consumidor final').strip() or 'Consumidor final'
    tax_id = (client_tax_id or 'CF').strip() or 'CF'
    existing = db.execute(
        select(models.Customer).where(
            models.Customer.company_id == company_id,
            models.Customer.tax_id == tax_id,
            models.Customer.is_deleted == False,
        )
    ).scalar_one_or_none()
    if existing:
        if name and existing.name != name:
            existing.name = name
        return existing
    customer = models.Customer(company_id=company_id, name=name, tax_id=tax_id, is_active=True)
    db.add(customer); db.flush(); return customer


def create_warehouse_exit(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    lines_data = values.pop('lines', [])
    if not lines_data:
        raise ValueError('Agrega al menos un lote a la salida de bodega.')

    default_warehouse = ensure_default_warehouse(db, company_id)
    exit_code = f'SAL-{(db.scalar(select(func.count(models.WarehouseExit.id)).where(models.WarehouseExit.company_id == company_id)) or 0) + 1:06d}'
    header = models.WarehouseExit(
        company_id=company_id,
        exit_code=exit_code,
        client_name=values.get('client_name') or 'Consumidor final',
        client_tax_id=values.get('client_tax_id') or 'CF',
        warehouse_id=default_warehouse.id,
        status='pendiente_facturar',
        is_invoiced=False,
        notes=values.get('notes') or '',
        internal_notes=values.get('internal_notes') or '',
        total_reference=Decimal('0'),
        is_active=True,
    )
    db.add(header)
    db.flush()
    ensure_customer_from_document(db, header.client_name, header.client_tax_id, company_id)

    total = Decimal('0')
    main_warehouse_id = None
    for line_data in lines_data:
        lot_id = int(line_data.get('lot_id') or 0)
        quantity = Decimal(str(line_data.get('quantity') or '0'))
        if quantity <= 0:
            raise ValueError('La cantidad de salida debe ser mayor que cero.')
        lot = db.get(models.Lot, lot_id)
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('El lote seleccionado no existe o no pertenece a la empresa actual.')
        if lot.is_blocked or not lot.is_sellable:
            raise ValueError(f'El lote {lot.lot_code} está bloqueado o no es vendible.')
        available_physical = Decimal(str(lot.physical_qty or 0)) - Decimal(str(lot.reserved_qty or 0)) - Decimal(str(lot.blocked_qty or 0))
        if quantity > available_physical:
            raise ValueError(f'El lote {lot.lot_code} no tiene suficiente disponible físico. Disponible: {available_physical}.')

        product = db.get(models.Product, lot.product_id)
        physical_before = Decimal(str(lot.physical_qty or 0))
        accounting_before = Decimal(str(lot.accounting_qty or 0))
        unit_price = Decimal(str(line_data.get('unit_price_reference') or lot.special_lot_price or lot.sale_price or 0))
        line_total = unit_price * quantity
        physical_after = physical_before - quantity

        lot.physical_qty = physical_after
        lot.quantity_available = physical_after
        lot.pending_exit_qty = Decimal(str(lot.pending_exit_qty or 0)) + quantity
        if physical_after <= 0:
            lot.inventory_status = 'pendiente_facturar'

        if main_warehouse_id is None:
            main_warehouse_id = lot.warehouse_id
            header.warehouse_id = lot.warehouse_id

        line = models.WarehouseExitLine(
            company_id=company_id,
            exit_id=header.id,
            product_id=lot.product_id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            description=(product.name if product else lot.lot_code),
            quantity=quantity,
            unit_price_reference=unit_price,
            total_reference=line_total,
            physical_before=physical_before,
            physical_after=physical_after,
            accounting_before=accounting_before,
            accounting_after=accounting_before,
            invoice_status='pendiente_facturar',
            notes=line_data.get('notes') or '',
        )
        db.add(line)
        movement = models.KardexMovement(
            company_id=company_id,
            product_id=lot.product_id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            movement_type='salida_bodega',
            reference_type='salida_bodega',
            reference_id=str(header.id),
            affects_physical=True,
            affects_accounting=False,
            quantity=quantity * Decimal('-1'),
            unit_cost=lot.unit_cost,
            physical_balance_after=physical_after,
            accounting_balance_after=accounting_before,
            balance_after=physical_after,
            notes='Salida de bodega: descuenta físico y queda pendiente de facturar. No descuenta contable.'
        )
        db.add(movement)
        total += line_total

    header.total_reference = total
    db.commit()
    db.refresh(header)
    return header


def list_sales_invoices(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.SalesInvoice)
        .where(models.SalesInvoice.company_id == company_id, models.SalesInvoice.is_deleted == False)
        .order_by(models.SalesInvoice.id.desc())
    ).scalars().all()

def list_sales_invoice_lines(db: Session, invoice_id: int, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.SalesInvoiceLine)
        .where(models.SalesInvoiceLine.company_id == company_id, models.SalesInvoiceLine.invoice_id == invoice_id)
        .order_by(models.SalesInvoiceLine.id.asc())
    ).scalars().all()

def create_invoice_from_exit(db: Session, exit_id: int, notes: str = '', company_id: int = DEFAULT_COMPANY_ID):
    header = db.get(models.WarehouseExit, exit_id)
    if header is None or header.company_id != company_id or header.is_deleted:
        raise ValueError('La salida de bodega no existe o no pertenece a la empresa actual.')
    if header.status == 'anulada':
        raise ValueError('No se puede facturar una salida anulada.')
    if header.is_invoiced or header.status in {'facturada_total', 'facturada'}:
        raise ValueError('Esta salida ya fue facturada. No se permite doble facturación.')

    lines = list_warehouse_exit_lines(db, exit_id, company_id)
    pending_lines = [line for line in lines if line.invoice_status != 'facturada']
    if not pending_lines:
        raise ValueError('La salida no tiene líneas pendientes de facturar.')

    invoice_code = f'FAC-{(db.scalar(select(func.count(models.SalesInvoice.id)).where(models.SalesInvoice.company_id == company_id)) or 0) + 1:06d}'
    invoice = models.SalesInvoice(
        company_id=company_id,
        invoice_code=invoice_code,
        source_exit_id=header.id,
        client_name=header.client_name,
        client_tax_id=header.client_tax_id,
        status='emitida',
        subtotal=Decimal('0'),
        tax_total=Decimal('0'),
        total=Decimal('0'),
        notes=notes or 'Factura creada desde salida de bodega. No descuenta físico nuevamente.',
        internal_notes=f'Origen: {header.exit_code}',
        is_active=True,
    )
    db.add(invoice)
    db.flush()

    subtotal = Decimal('0')
    for src_line in pending_lines:
        lot = db.get(models.Lot, src_line.lot_id)
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('Uno de los lotes de la salida ya no existe.')

        qty = Decimal(str(src_line.quantity or 0))
        unit_price = Decimal(str(src_line.unit_price_reference or 0))
        line_total = unit_price * qty
        accounting_before = Decimal(str(lot.accounting_qty or 0))
        physical_before = Decimal(str(lot.physical_qty or 0))

        # La salida ya descontó físico. La factura posterior solo regulariza contable.
        if lot.is_out_of_accounting_inventory:
            accounting_after = accounting_before
            affects_accounting = False
            note = 'Factura desde salida: lote fuera de inventario contable; no descuenta contable.'
        else:
            if qty > accounting_before:
                raise ValueError(f'El lote {lot.lot_code} no tiene suficiente existencia contable para facturar. Contable disponible: {accounting_before}.')
            accounting_after = accounting_before - qty
            lot.accounting_qty = accounting_after
            affects_accounting = True
            note = 'Factura desde salida: descuenta contable sin descontar físico nuevamente.'

        # La salida ya dejó pendiente_exit_qty; la factura cierra esa cantidad pendiente.
        pending_before = Decimal(str(lot.pending_exit_qty or 0))
        lot.pending_exit_qty = max(Decimal('0'), pending_before - qty)
        if lot.physical_qty > 0:
            lot.inventory_status = 'disponible'
        elif lot.pending_exit_qty > 0:
            lot.inventory_status = 'pendiente_facturar'
        else:
            lot.inventory_status = 'vendido'

        inv_line = models.SalesInvoiceLine(
            company_id=company_id,
            invoice_id=invoice.id,
            source_exit_line_id=src_line.id,
            product_id=src_line.product_id,
            lot_id=src_line.lot_id,
            warehouse_id=src_line.warehouse_id,
            description=src_line.description,
            quantity=qty,
            unit_price=unit_price,
            tax_rate=Decimal('12'),
            total_line=line_total,
            affects_physical=False,
            affects_accounting=affects_accounting,
            physical_before=physical_before,
            physical_after=physical_before,
            accounting_before=accounting_before,
            accounting_after=accounting_after,
            notes=note,
        )
        db.add(inv_line)
        movement = models.KardexMovement(
            company_id=company_id,
            product_id=src_line.product_id,
            lot_id=src_line.lot_id,
            warehouse_id=src_line.warehouse_id,
            movement_type='factura_desde_salida',
            reference_type='factura',
            reference_id=str(invoice.id),
            affects_physical=False,
            affects_accounting=affects_accounting,
            quantity=(qty * Decimal('-1')) if affects_accounting else Decimal('0'),
            unit_cost=lot.unit_cost,
            physical_balance_after=physical_before,
            accounting_balance_after=accounting_after,
            balance_after=physical_before,
            notes=note,
        )
        db.add(movement)
        src_line.invoice_status = 'facturada'
        subtotal += line_total

    invoice.subtotal = subtotal
    invoice.tax_total = Decimal('0')
    invoice.total = subtotal
    header.is_invoiced = True
    header.invoice_reference = invoice.invoice_code
    header.status = 'facturada_total'
    db.commit()
    db.refresh(invoice)
    return invoice


def create_direct_invoice(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    lines_data = values.pop('lines', [])
    if not lines_data:
        raise ValueError('Agrega al menos un lote a la factura directa.')

    invoice_code = f'FAC-{(db.scalar(select(func.count(models.SalesInvoice.id)).where(models.SalesInvoice.company_id == company_id)) or 0) + 1:06d}'
    invoice = models.SalesInvoice(
        company_id=company_id,
        invoice_code=invoice_code,
        source_exit_id=None,
        client_name=values.get('client_name') or 'Consumidor final',
        client_tax_id=values.get('client_tax_id') or 'CF',
        status='emitida',
        subtotal=Decimal('0'),
        tax_total=Decimal('0'),
        total=Decimal('0'),
        notes=values.get('notes') or 'Factura directa. Descuenta físico y contable en el mismo flujo.',
        internal_notes=values.get('internal_notes') or '',
        is_active=True,
    )
    db.add(invoice)
    db.flush()
    ensure_customer_from_document(db, invoice.client_name, invoice.client_tax_id, company_id)

    subtotal = Decimal('0')
    for line_data in lines_data:
        lot_id = int(line_data.get('lot_id') or 0)
        quantity = Decimal(str(line_data.get('quantity') or '0'))
        if quantity <= 0:
            raise ValueError('La cantidad de factura debe ser mayor que cero.')
        lot = db.get(models.Lot, lot_id)
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('El lote seleccionado no existe o no pertenece a la empresa actual.')
        if lot.is_blocked or not lot.is_sellable:
            raise ValueError(f'El lote {lot.lot_code} está bloqueado o no es vendible.')
        physical_before = Decimal(str(lot.physical_qty or 0))
        accounting_before = Decimal(str(lot.accounting_qty or 0))
        reserved = Decimal(str(lot.reserved_qty or 0))
        blocked = Decimal(str(lot.blocked_qty or 0))
        available_physical = physical_before - reserved - blocked
        if quantity > available_physical:
            raise ValueError(f'El lote {lot.lot_code} no tiene suficiente disponible físico. Disponible: {available_physical}.')

        unit_price = Decimal(str(line_data.get('unit_price') or lot.special_lot_price or lot.sale_price or 0))
        line_total = unit_price * quantity
        physical_after = physical_before - quantity

        affects_accounting = not bool(lot.is_out_of_accounting_inventory)
        if affects_accounting:
            if quantity > accounting_before:
                raise ValueError(f'El lote {lot.lot_code} no tiene suficiente existencia contable. Contable disponible: {accounting_before}.')
            accounting_after = accounting_before - quantity
        else:
            accounting_after = accounting_before

        lot.physical_qty = physical_after
        lot.quantity_available = physical_after
        if affects_accounting:
            lot.accounting_qty = accounting_after
        lot.inventory_status = 'disponible' if physical_after > 0 else 'vendido'

        product = db.get(models.Product, lot.product_id)
        description = product.name if product else f'Lote {lot.lot_code}'
        inv_line = models.SalesInvoiceLine(
            company_id=company_id,
            invoice_id=invoice.id,
            source_exit_line_id=None,
            product_id=lot.product_id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            tax_rate=Decimal('12'),
            total_line=line_total,
            affects_physical=True,
            affects_accounting=affects_accounting,
            physical_before=physical_before,
            physical_after=physical_after,
            accounting_before=accounting_before,
            accounting_after=accounting_after,
            notes=line_data.get('notes') or 'Factura directa: descuenta físico y contable cuando aplica.',
        )
        db.add(inv_line)
        movement = models.KardexMovement(
            company_id=company_id,
            product_id=lot.product_id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            movement_type='factura_directa',
            reference_type='factura',
            reference_id=str(invoice.id),
            affects_physical=True,
            affects_accounting=affects_accounting,
            quantity=quantity * Decimal('-1'),
            unit_cost=lot.unit_cost,
            physical_balance_after=physical_after,
            accounting_balance_after=accounting_after,
            balance_after=physical_after,
            notes='Factura directa: descuenta físico y contable cuando aplica.'
        )
        db.add(movement)
        subtotal += line_total

    invoice.subtotal = subtotal
    invoice.tax_total = Decimal('0')
    invoice.total = subtotal
    db.commit()
    db.refresh(invoice)
    return invoice


def void_warehouse_exit(db: Session, exit_id: int, reason: str = 'Anulación operativa', company_id: int = DEFAULT_COMPANY_ID):
    header = db.get(models.WarehouseExit, exit_id)
    if header is None or header.company_id != company_id or header.is_deleted:
        raise ValueError('La salida de bodega no existe o no pertenece a la empresa actual.')
    if header.status == 'anulada':
        raise ValueError('La salida ya está anulada.')
    if header.is_invoiced or header.status in {'facturada_total', 'facturada'}:
        raise ValueError('No se puede anular directamente una salida ya facturada. Primero debe anularse la factura relacionada.')
    lines = list_warehouse_exit_lines(db, exit_id, company_id)
    for line in lines:
        lot = db.get(models.Lot, line.lot_id)
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('Uno de los lotes de la salida ya no existe.')
        qty = Decimal(str(line.quantity or 0))
        physical_before = Decimal(str(lot.physical_qty or 0))
        accounting_before = Decimal(str(lot.accounting_qty or 0))
        physical_after = physical_before + qty
        lot.physical_qty = physical_after
        lot.quantity_available = physical_after
        lot.pending_exit_qty = max(Decimal('0'), Decimal(str(lot.pending_exit_qty or 0)) - qty)
        lot.inventory_status = 'disponible'
        line.invoice_status = 'anulada'
        db.add(models.KardexMovement(
            company_id=company_id,
            product_id=line.product_id,
            lot_id=line.lot_id,
            warehouse_id=line.warehouse_id,
            movement_type='anulacion_salida',
            reference_type='salida_bodega',
            reference_id=str(header.id),
            affects_physical=True,
            affects_accounting=False,
            quantity=qty,
            unit_cost=lot.unit_cost,
            physical_balance_after=physical_after,
            accounting_balance_after=accounting_before,
            balance_after=physical_after,
            notes=f'Anulación de salida de bodega. Motivo: {reason}'
        ))
    header.status = 'anulada'
    header.notes = (header.notes or '') + f'\nAnulada: {reason}'
    db.commit(); db.refresh(header); return header


def void_sales_invoice(db: Session, invoice_id: int, reason: str = 'Anulación operativa', company_id: int = DEFAULT_COMPANY_ID):
    invoice = db.get(models.SalesInvoice, invoice_id)
    if invoice is None or invoice.company_id != company_id or invoice.is_deleted:
        raise ValueError('La factura no existe o no pertenece a la empresa actual.')
    if invoice.status == 'anulada':
        raise ValueError('La factura ya está anulada.')
    lines = list_sales_invoice_lines(db, invoice_id, company_id)
    for line in lines:
        lot = db.get(models.Lot, line.lot_id) if line.lot_id else None
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('Uno de los lotes de la factura ya no existe.')
        qty = Decimal(str(line.quantity or 0))
        physical_before = Decimal(str(lot.physical_qty or 0))
        accounting_before = Decimal(str(lot.accounting_qty or 0))
        physical_after = physical_before + qty if line.affects_physical else physical_before
        accounting_after = accounting_before + qty if line.affects_accounting else accounting_before
        if line.affects_physical:
            lot.physical_qty = physical_after
            lot.quantity_available = physical_after
        if line.affects_accounting:
            lot.accounting_qty = accounting_after
        lot.inventory_status = 'disponible'
        db.add(models.KardexMovement(
            company_id=company_id,
            product_id=line.product_id,
            lot_id=line.lot_id,
            warehouse_id=line.warehouse_id,
            movement_type='anulacion_factura',
            reference_type='factura',
            reference_id=str(invoice.id),
            affects_physical=bool(line.affects_physical),
            affects_accounting=bool(line.affects_accounting),
            quantity=qty,
            unit_cost=lot.unit_cost,
            physical_balance_after=physical_after,
            accounting_balance_after=accounting_after,
            balance_after=physical_after,
            notes=f'Anulación de factura. Motivo: {reason}'
        ))
    if invoice.source_exit_id:
        header = db.get(models.WarehouseExit, invoice.source_exit_id)
        if header is not None and header.company_id == company_id:
            header.is_invoiced = False
            header.invoice_reference = ''
            header.status = 'pendiente_facturar'
            for src_line in list_warehouse_exit_lines(db, header.id, company_id):
                src_line.invoice_status = 'pendiente_facturar'
                if src_line.lot_id:
                    lot = db.get(models.Lot, src_line.lot_id)
                    if lot is not None and lot.company_id == company_id:
                        lot.pending_exit_qty = Decimal(str(lot.pending_exit_qty or 0)) + Decimal(str(src_line.quantity or 0))
    invoice.status = 'anulada'
    invoice.notes = (invoice.notes or '') + f'\nAnulada: {reason}'
    db.commit(); db.refresh(invoice); return invoice


def _next_purchase_code(db: Session, company_id: int = DEFAULT_COMPANY_ID) -> str:
    count = db.scalar(select(func.count(models.Purchase.id)).where(models.Purchase.company_id == company_id)) or 0
    return f'COM-{count + 1:06d}'


def _next_lot_code_for_product(db: Session, product: models.Product, company_id: int = DEFAULT_COMPANY_ID) -> str:
    category = db.get(models.Category, product.product_category_id or product.category_id or 0)
    prefix = ((category.sku_prefix if category else '') or product.sku or 'LOT').upper().replace(' ', '-')[:24]
    count = db.scalar(
        select(func.count(models.Lot.id))
        .join(models.Product, models.Product.id == models.Lot.product_id)
        .where(models.Lot.company_id == company_id, models.Product.product_category_id == product.product_category_id, models.Lot.lot_code.ilike(f'{prefix}-%'))
    ) or 0
    candidate = f'{prefix}-{count + 1:05d}'
    while db.execute(select(models.Lot.id).where(models.Lot.company_id == company_id, models.Lot.lot_code == candidate)).first():
        count += 1
        candidate = f'{prefix}-{count + 1:05d}'
    return candidate


def list_suppliers(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.Supplier)
        .where(models.Supplier.company_id == company_id, models.Supplier.is_deleted == False)
        .order_by(models.Supplier.name.asc())
    ).scalars().all()


def create_supplier(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    name = (values.get('name') or '').strip()
    if not name:
        raise ValueError('El nombre del proveedor es obligatorio.')
    tax_id = (values.get('tax_id') or 'CF').strip() or 'CF'
    existing = db.execute(
        select(models.Supplier).where(
            models.Supplier.company_id == company_id,
            models.Supplier.tax_id == tax_id,
            models.Supplier.is_deleted == False,
        )
    ).scalar_one_or_none()
    if existing:
        # Si ya existe, actualizamos datos utiles sin duplicar proveedor.
        existing.name = name
        existing.contact_name = values.get('contact_name') or existing.contact_name or ''
        existing.phone = values.get('phone') or existing.phone or ''
        existing.email = values.get('email') or existing.email or ''
        existing.address = values.get('address') or existing.address or ''
        existing.notes = values.get('notes') or existing.notes or ''
        db.commit(); db.refresh(existing); return existing
    supplier = models.Supplier(
        company_id=company_id,
        name=name,
        tax_id=tax_id,
        contact_name=values.get('contact_name') or '',
        phone=values.get('phone') or '',
        email=values.get('email') or '',
        address=values.get('address') or '',
        notes=values.get('notes') or '',
        is_active=True,
    )
    db.add(supplier); db.commit(); db.refresh(supplier); return supplier


def ensure_supplier_from_purchase(db: Session, supplier_name: str, supplier_tax_id: str, company_id: int = DEFAULT_COMPANY_ID):
    name = (supplier_name or 'Proveedor general').strip() or 'Proveedor general'
    tax_id = (supplier_tax_id or 'CF').strip() or 'CF'
    existing = db.execute(
        select(models.Supplier).where(
            models.Supplier.company_id == company_id,
            models.Supplier.tax_id == tax_id,
            models.Supplier.is_deleted == False,
        )
    ).scalar_one_or_none()
    if existing:
        if name and existing.name != name:
            existing.name = name
        return existing
    supplier = models.Supplier(company_id=company_id, name=name, tax_id=tax_id, is_active=True)
    db.add(supplier); db.flush(); return supplier


def list_purchases(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.Purchase)
        .where(models.Purchase.company_id == company_id, models.Purchase.is_deleted == False)
        .order_by(models.Purchase.id.desc())
    ).scalars().all()


def list_purchase_lines(db: Session, purchase_id: int, company_id: int = DEFAULT_COMPANY_ID):
    return db.execute(
        select(models.PurchaseLine)
        .where(models.PurchaseLine.company_id == company_id, models.PurchaseLine.purchase_id == purchase_id)
        .order_by(models.PurchaseLine.id.asc())
    ).scalars().all()


def create_purchase(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    values = data.model_dump()
    lines_data = values.pop('lines', [])
    if not lines_data:
        raise ValueError('Agrega al menos una línea de producto a la compra.')

    requested_status = (values.get('status') or 'registrada').strip().lower()
    if requested_status not in ('borrador', 'registrada'):
        requested_status = 'registrada'

    default_warehouse = ensure_default_warehouse(db, company_id)
    header_warehouse_id = values.get('warehouse_id') or default_warehouse.id
    wh = db.get(models.Warehouse, header_warehouse_id)
    if wh is None or wh.company_id != company_id or wh.is_deleted:
        header_warehouse_id = default_warehouse.id

    purchase = models.Purchase(
        company_id=company_id,
        purchase_code=_next_purchase_code(db, company_id),
        supplier_name=values.get('supplier_name') or 'Proveedor general',
        supplier_tax_id=values.get('supplier_tax_id') or 'CF',
        warehouse_id=header_warehouse_id,
        status=requested_status,
        document_reference=values.get('document_reference') or '',
        subtotal=Decimal('0'),
        tax_total=Decimal('0'),
        total=Decimal('0'),
        notes=values.get('notes') or '',
        internal_notes=values.get('internal_notes') or '',
        is_active=True,
    )
    db.add(purchase)
    db.flush()
    ensure_supplier_from_purchase(db, purchase.supplier_name, purchase.supplier_tax_id, company_id)

    subtotal = Decimal('0')
    for line_data in lines_data:
        product_id = int(line_data.get('product_id') or 0)
        product = db.get(models.Product, product_id)
        if product is None or product.company_id != company_id or product.is_deleted:
            raise ValueError('Uno de los productos de la compra no existe o no pertenece a la empresa actual.')

        quantity = Decimal(str(line_data.get('quantity') or '0'))
        if quantity <= 0:
            raise ValueError('La cantidad de compra debe ser mayor que cero.')
        unit_cost = Decimal(str(line_data.get('unit_cost_with_tax') or '0'))
        if unit_cost < 0:
            raise ValueError('El costo unitario no puede ser negativo.')

        warehouse_id = line_data.get('warehouse_id') or header_warehouse_id or default_warehouse.id
        wh = db.get(models.Warehouse, int(warehouse_id))
        if wh is None or wh.company_id != company_id or wh.is_deleted:
            warehouse_id = default_warehouse.id

        out_accounting = bool(line_data.get('is_out_of_accounting_inventory'))
        accounting_qty = Decimal('0') if out_accounting else quantity
        line_total = unit_cost * quantity

        lot_id = None
        physical_before = Decimal('0')
        physical_after = Decimal('0')
        accounting_before = Decimal('0')
        accounting_after = Decimal('0')

        if requested_status == 'registrada':
            lot_code = (line_data.get('lot_code') or '').strip() or _next_lot_code_for_product(db, product, company_id)
            if db.execute(select(models.Lot.id).where(models.Lot.company_id == company_id, models.Lot.lot_code == lot_code)).first():
                raise ValueError(f'El código de lote {lot_code} ya existe. Usa otro código o deja el campo vacío para autogenerarlo.')

            lot = models.Lot(
                company_id=company_id,
                product_id=product.id,
                warehouse_id=int(warehouse_id),
                lot_code=lot_code,
                barcode='',
                qr_code='',
                engine_number='',
                serial_number='',
                condition=product.condition or 'nuevo',
                location='',
                quantity_initial=quantity,
                quantity_available=quantity,
                physical_initial_qty=quantity,
                physical_qty=quantity,
                accounting_initial_qty=accounting_qty,
                accounting_qty=accounting_qty,
                reserved_qty=Decimal('0'),
                pending_exit_qty=Decimal('0'),
                blocked_qty=Decimal('0'),
                unit_cost=unit_cost,
                cost_includes_tax=True,
                sale_price=product.price_sale or Decimal('0'),
                special_lot_price=Decimal('0'),
                is_out_of_accounting_inventory=out_accounting,
                is_sellable=True,
                is_blocked=False,
                inventory_status='disponible',
                is_disassemblable=False,
                disassembly_status='no_aplica',
                original_cost=unit_cost * quantity,
                distributed_cost=Decimal('0'),
                pending_cost_to_distribute=unit_cost * quantity,
                notes=f'Lote creado desde compra {purchase.purchase_code}. {line_data.get("notes") or ""}'.strip(),
                is_active=True,
            )
            db.add(lot)
            db.flush()
            lot_id = lot.id
            physical_after = quantity
            accounting_after = accounting_qty
            movement = models.KardexMovement(
                company_id=company_id,
                product_id=product.id,
                lot_id=lot.id,
                warehouse_id=lot.warehouse_id,
                movement_type='compra',
                reference_type='compra',
                reference_id=str(purchase.id),
                affects_physical=True,
                affects_accounting=not out_accounting,
                quantity=quantity,
                unit_cost=unit_cost,
                physical_balance_after=quantity,
                accounting_balance_after=accounting_qty,
                balance_after=quantity,
                notes='Compra registrada: entrada física y contable cuando aplica. Costo con IVA incluido.'
            )
            db.add(movement)

        pline = models.PurchaseLine(
            company_id=company_id,
            purchase_id=purchase.id,
            product_id=product.id,
            lot_id=lot_id,
            warehouse_id=int(warehouse_id),
            description=product.name,
            quantity=quantity,
            unit_cost_with_tax=unit_cost,
            line_total_with_tax=line_total,
            is_out_of_accounting_inventory=out_accounting,
            physical_before=physical_before,
            physical_after=physical_after,
            accounting_before=accounting_before,
            accounting_after=accounting_after,
            notes=line_data.get('notes') or ('Línea en borrador. No afecta inventario hasta registrar.' if requested_status == 'borrador' else 'Entrada generada desde compra. Costo con IVA incluido.'),
        )
        db.add(pline)
        subtotal += line_total

    purchase.subtotal = subtotal
    purchase.tax_total = Decimal('0')
    purchase.total = subtotal
    db.commit()
    db.refresh(purchase)
    return purchase


def register_purchase(db: Session, purchase_id: int, company_id: int = DEFAULT_COMPANY_ID):
    purchase = db.get(models.Purchase, purchase_id)
    if purchase is None or purchase.company_id != company_id or purchase.is_deleted:
        raise ValueError('Compra no encontrada.')
    if purchase.status == 'anulada':
        raise ValueError('La compra está anulada y no puede registrarse.')
    if purchase.status == 'registrada':
        raise ValueError('La compra ya está registrada.')

    lines = list_purchase_lines(db, purchase_id, company_id)
    if not lines:
        raise ValueError('La compra no tiene líneas para registrar.')

    default_warehouse = ensure_default_warehouse(db, company_id)
    for line in lines:
        product = db.get(models.Product, line.product_id)
        if product is None or product.company_id != company_id or product.is_deleted:
            raise ValueError('Uno de los productos de la compra ya no existe.')
        if Decimal(str(line.quantity or 0)) <= 0:
            raise ValueError('La cantidad de una línea debe ser mayor que cero.')
        if Decimal(str(line.unit_cost_with_tax or 0)) < 0:
            raise ValueError('El costo unitario no puede ser negativo.')

    for line in lines:
        product = db.get(models.Product, line.product_id)
        quantity = Decimal(str(line.quantity or 0))
        unit_cost = Decimal(str(line.unit_cost_with_tax or 0))
        out_accounting = bool(line.is_out_of_accounting_inventory)
        accounting_qty = Decimal('0') if out_accounting else quantity
        warehouse_id = line.warehouse_id or purchase.warehouse_id or default_warehouse.id
        wh = db.get(models.Warehouse, int(warehouse_id))
        if wh is None or wh.company_id != company_id or wh.is_deleted:
            warehouse_id = default_warehouse.id

        lot_code = _next_lot_code_for_product(db, product, company_id)
        lot = models.Lot(
            company_id=company_id,
            product_id=product.id,
            warehouse_id=int(warehouse_id),
            lot_code=lot_code,
            barcode='', qr_code='', engine_number='', serial_number='',
            condition=product.condition or 'nuevo',
            location='',
            quantity_initial=quantity,
            quantity_available=quantity,
            physical_initial_qty=quantity,
            physical_qty=quantity,
            accounting_initial_qty=accounting_qty,
            accounting_qty=accounting_qty,
            reserved_qty=Decimal('0'),
            pending_exit_qty=Decimal('0'),
            blocked_qty=Decimal('0'),
            unit_cost=unit_cost,
            cost_includes_tax=True,
            sale_price=product.price_sale or Decimal('0'),
            special_lot_price=Decimal('0'),
            is_out_of_accounting_inventory=out_accounting,
            is_sellable=True,
            is_blocked=False,
            inventory_status='disponible',
            is_disassemblable=False,
            disassembly_status='no_aplica',
            original_cost=unit_cost * quantity,
            distributed_cost=Decimal('0'),
            pending_cost_to_distribute=unit_cost * quantity,
            notes=f'Lote creado al registrar compra {purchase.purchase_code}. {line.notes or ""}'.strip(),
            is_active=True,
        )
        db.add(lot); db.flush()

        line.lot_id = lot.id
        line.warehouse_id = lot.warehouse_id
        line.physical_after = quantity
        line.accounting_after = accounting_qty
        line.notes = (line.notes or '') + '\nCompra registrada: lote creado y entrada generada.'

        db.add(models.KardexMovement(
            company_id=company_id,
            product_id=product.id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            movement_type='compra',
            reference_type='compra',
            reference_id=str(purchase.id),
            affects_physical=True,
            affects_accounting=not out_accounting,
            quantity=quantity,
            unit_cost=unit_cost,
            physical_balance_after=quantity,
            accounting_balance_after=accounting_qty,
            balance_after=quantity,
            notes='Compra registrada desde borrador: entrada física y contable cuando aplica. Costo con IVA incluido.'
        ))

    purchase.status = 'registrada'
    purchase.notes = (purchase.notes or '') + '\nCompra registrada desde borrador.'
    db.commit(); db.refresh(purchase); return purchase




def update_purchase_draft(db: Session, purchase_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    """Edita una compra en borrador sin afectar inventario.

    Regla v14: solo los documentos en borrador pueden editarse libremente.
    Una compra registrada ya produjo lotes/Kardex y debe corregirse con documentos
    de anulación o regularización, no con edición directa.
    """
    purchase = db.get(models.Purchase, purchase_id)
    if purchase is None or purchase.company_id != company_id or purchase.is_deleted:
        raise ValueError('Compra no encontrada.')
    if purchase.status != 'borrador':
        raise ValueError('Solo se pueden editar compras en borrador. Las compras registradas deben anularse o regularizarse.')

    values = data.model_dump()
    lines_data = values.pop('lines', [])
    if not lines_data:
        raise ValueError('Agrega al menos una línea de producto a la compra.')

    default_warehouse = ensure_default_warehouse(db, company_id)
    header_warehouse_id = values.get('warehouse_id') or purchase.warehouse_id or default_warehouse.id
    wh = db.get(models.Warehouse, int(header_warehouse_id)) if header_warehouse_id else None
    if wh is None or wh.company_id != company_id or wh.is_deleted:
        header_warehouse_id = default_warehouse.id

    purchase.supplier_name = values.get('supplier_name') or purchase.supplier_name or 'Proveedor general'
    purchase.supplier_tax_id = values.get('supplier_tax_id') or purchase.supplier_tax_id or 'CF'
    purchase.warehouse_id = int(header_warehouse_id)
    purchase.document_reference = values.get('document_reference') or ''
    purchase.notes = values.get('notes') or ''
    purchase.internal_notes = values.get('internal_notes') or ''
    ensure_supplier_from_purchase(db, purchase.supplier_name, purchase.supplier_tax_id, company_id)

    # Las líneas en borrador no tienen lote ni movimientos. Se reemplazan completamente.
    old_lines = list_purchase_lines(db, purchase.id, company_id)
    for old in old_lines:
        if old.lot_id:
            raise ValueError('Esta compra ya tiene lotes vinculados y no puede editarse como borrador.')
        db.delete(old)
    db.flush()

    subtotal = Decimal('0')
    for line_data in lines_data:
        product_id = int(line_data.get('product_id') or 0)
        product = db.get(models.Product, product_id)
        if product is None or product.company_id != company_id or product.is_deleted:
            raise ValueError('Uno de los productos de la compra no existe o no pertenece a la empresa actual.')
        quantity = Decimal(str(line_data.get('quantity') or '0'))
        if quantity <= 0:
            raise ValueError('La cantidad de compra debe ser mayor que cero.')
        unit_cost = Decimal(str(line_data.get('unit_cost_with_tax') or '0'))
        if unit_cost < 0:
            raise ValueError('El costo unitario no puede ser negativo.')
        warehouse_id = line_data.get('warehouse_id') or purchase.warehouse_id or default_warehouse.id
        wh = db.get(models.Warehouse, int(warehouse_id)) if warehouse_id else None
        if wh is None or wh.company_id != company_id or wh.is_deleted:
            warehouse_id = default_warehouse.id
        out_accounting = bool(line_data.get('is_out_of_accounting_inventory'))
        line_total = unit_cost * quantity
        db.add(models.PurchaseLine(
            company_id=company_id,
            purchase_id=purchase.id,
            product_id=product.id,
            lot_id=None,
            warehouse_id=int(warehouse_id),
            description=product.name,
            quantity=quantity,
            unit_cost_with_tax=unit_cost,
            line_total_with_tax=line_total,
            is_out_of_accounting_inventory=out_accounting,
            physical_before=Decimal('0'), physical_after=Decimal('0'),
            accounting_before=Decimal('0'), accounting_after=Decimal('0'),
            notes=line_data.get('notes') or 'Línea en borrador actualizada. No afecta inventario hasta registrar.',
        ))
        subtotal += line_total

    purchase.subtotal = subtotal
    purchase.tax_total = Decimal('0')
    purchase.total = subtotal
    db.commit(); db.refresh(purchase); return purchase


def list_supplier_purchases(db: Session, supplier_id: int, company_id: int = DEFAULT_COMPANY_ID):
    supplier = db.get(models.Supplier, supplier_id)
    if supplier is None or supplier.company_id != company_id or supplier.is_deleted:
        raise ValueError('Proveedor no encontrado.')
    return db.execute(
        select(models.Purchase)
        .where(models.Purchase.company_id == company_id, models.Purchase.is_deleted == False, models.Purchase.supplier_tax_id == supplier.tax_id)
        .order_by(models.Purchase.id.desc())
    ).scalars().all()


def void_purchase(db: Session, purchase_id: int, reason: str = 'Anulación de compra', company_id: int = DEFAULT_COMPANY_ID):
    purchase = db.get(models.Purchase, purchase_id)
    if purchase is None or purchase.company_id != company_id or purchase.is_deleted:
        raise ValueError('Compra no encontrada.')
    if purchase.status == 'anulada':
        raise ValueError('La compra ya está anulada.')

    lines = list_purchase_lines(db, purchase_id, company_id)
    for line in lines:
        lot = db.get(models.Lot, line.lot_id) if line.lot_id else None
        if lot is None or lot.company_id != company_id or lot.is_deleted:
            raise ValueError('No se puede anular la compra porque uno de los lotes ya no existe.')

        physical_to_reverse = Decimal(str(line.quantity or 0))
        accounting_to_reverse = Decimal('0') if line.is_out_of_accounting_inventory else Decimal(str(line.quantity or 0))

        if Decimal(str(lot.physical_qty or 0)) < physical_to_reverse:
            raise ValueError(f'No se puede anular la compra {purchase.purchase_code}: el lote {lot.lot_code} ya tuvo salidas o ventas.')
        if accounting_to_reverse > 0 and Decimal(str(lot.accounting_qty or 0)) < accounting_to_reverse:
            raise ValueError(f'No se puede anular la compra {purchase.purchase_code}: el lote {lot.lot_code} ya tuvo movimientos contables.')

    for line in lines:
        lot = db.get(models.Lot, line.lot_id)
        physical_to_reverse = Decimal(str(line.quantity or 0))
        accounting_to_reverse = Decimal('0') if line.is_out_of_accounting_inventory else Decimal(str(line.quantity or 0))
        lot.physical_qty = Decimal(str(lot.physical_qty or 0)) - physical_to_reverse
        lot.quantity_available = lot.physical_qty
        lot.accounting_qty = Decimal(str(lot.accounting_qty or 0)) - accounting_to_reverse
        lot.inventory_status = 'anulado_compra'
        lot.is_sellable = False
        lot.is_blocked = True
        lot.notes = (lot.notes or '') + f'\nAnulado por compra {purchase.purchase_code}: {reason}'

        movement = models.KardexMovement(
            company_id=company_id,
            product_id=line.product_id,
            lot_id=lot.id,
            warehouse_id=lot.warehouse_id,
            movement_type='anulacion_compra',
            reference_type='compra',
            reference_id=str(purchase.id),
            affects_physical=True,
            affects_accounting=not line.is_out_of_accounting_inventory,
            quantity=physical_to_reverse * Decimal('-1'),
            unit_cost=line.unit_cost_with_tax,
            physical_balance_after=lot.physical_qty,
            accounting_balance_after=lot.accounting_qty,
            balance_after=lot.physical_qty,
            notes=f'Anulación de compra {purchase.purchase_code}. {reason}'
        )
        db.add(movement)

    purchase.status = 'anulada'
    purchase.notes = (purchase.notes or '') + f'\nAnulada: {reason}'
    purchase.is_active = False
    db.commit(); db.refresh(purchase); return purchase
