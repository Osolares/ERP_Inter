from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.domains.settings.models import AppSetting
from app.domains.companies.models import Company
try:
    from app.core.audit.models import AuditLog
except Exception:  # pragma: no cover
    AuditLog = None

COMPANY_ID = 1


def ensure_companies_table_and_default(db: Session) -> None:
    """Garantía defensiva para instalaciones viejas.

    v14 debe poder arrancar aunque la base venga de un ZIP anterior o aunque
    una migración correctiva no se haya aplicado todavía. Por eso esta función
    asegura, con SQL directo, que exista la tabla companies y la empresa base
    antes de sembrar app_settings.
    """
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            trade_name VARCHAR(160) NOT NULL DEFAULT '',
            tax_id VARCHAR(32) NOT NULL DEFAULT '',
            timezone VARCHAR(64) NOT NULL DEFAULT 'America/Guatemala',
            date_format VARCHAR(24) NOT NULL DEFAULT 'dd/MM/yyyy',
            time_format VARCHAR(24) NOT NULL DEFAULT 'HH:mm:ss',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ NULL
        )
    """))
    db.execute(text("""
        INSERT INTO companies (
            id, name, trade_name, tax_id, timezone, date_format, time_format,
            is_active, created_at, updated_at, is_deleted, deleted_at
        )
        VALUES (
            1, 'Intermotores', 'Intermotores', 'CF', 'America/Guatemala',
            'dd/MM/yyyy', 'HH:mm:ss', true, NOW(), NOW(), false, NULL
        )
        ON CONFLICT (id) DO UPDATE SET
            is_active = true,
            is_deleted = false,
            updated_at = NOW()
    """))
    db.flush()


def ensure_default_company(db: Session) -> Company:
    ensure_companies_table_and_default(db)
    company = db.get(Company, COMPANY_ID)
    if company:
        if company.is_deleted or not company.is_active:
            company.is_deleted = False
            company.is_active = True
        return company
    # Fallback extremo si por alguna razón el ORM no ve la fila recién creada.
    now = datetime.now(timezone.utc)
    company = Company(
        id=COMPANY_ID,
        name='Intermotores',
        trade_name='Intermotores',
        tax_id='CF',
        timezone='America/Guatemala',
        date_format='dd/MM/yyyy',
        time_format='HH:mm:ss',
        is_active=True,
        is_deleted=False,
        created_at=now,
        updated_at=now,
    )
    db.add(company)
    db.flush()
    return company

DEFAULT_SETTINGS = [
    {'group':'company','key':'company.name','value':'Intermotores','value_type':'string','label':'Nombre de empresa','description':'Nombre comercial usado en documentos y encabezados.'},
    {'group':'company','key':'company.country','value':'Guatemala','value_type':'string','label':'País fiscal','description':'País fiscal por defecto.'},
    {'group':'company','key':'company.timezone','value':'America/Guatemala','value_type':'string','label':'Zona horaria','description':'Zona horaria por defecto del sistema.'},
    {'group':'company','key':'company.date_format','value':'dd/MM/yyyy','value_type':'string','label':'Formato de fecha','description':'Formato visual para fechas.'},
    {'group':'company','key':'company.time_format','value':'HH:mm:ss','value_type':'string','label':'Formato de hora','description':'Formato visual para horas.'},
    {'group':'company','key':'company.currency','value':'GTQ','value_type':'string','label':'Moneda por defecto','description':'Quetzal Guatemalteco por defecto.'},
    {'group':'company','key':'company.tax_rate','value':'12','value_type':'decimal','label':'IVA por defecto %','description':'Impuesto por defecto para operaciones locales.'},
    {'group':'inventory','key':'inventory.costs_include_tax','value':'true','value_type':'boolean','label':'Costos con IVA incluido','description':'Los costos de lotes se ingresan con IVA incluido.'},
    {'group':'inventory','key':'inventory.available_for_sale_mode','value':'fisico','value_type':'select','label':'Disponible para venta','description':'Modo base para validar ventas: físico, contable o ambos.'},
    {'group':'inventory','key':'inventory.default_warehouse_code','value':'CENTRAL','value_type':'string','label':'Bodega por defecto','description':'Bodega creada automáticamente cuando no existe otra.'},
    {'group':'inventory','key':'inventory.allow_out_accounting_lots','value':'true','value_type':'boolean','label':'Permitir lotes fuera contable','description':'Permite vender/documentar lotes fuera de inventario contable.'},
    {'group':'inventory','key':'inventory.allow_negative_stock','value':'false','value_type':'boolean','label':'Permitir negativos','description':'Permite vender sin disponibilidad; requiere permisos especiales.'},
    {'group':'inventory','key':'inventory.low_stock_default','value':'1','value_type':'decimal','label':'Stock mínimo por defecto','description':'Valor usado para alertas de bajo stock.'},
    {'group':'inventory','key':'inventory.allow_disassembly','value':'true','value_type':'boolean','label':'Permitir desarmes','description':'Habilita lotes desarmables y documento de desarme futuro.'},
    {'group':'products','key':'products.default_condition','value':'nuevo','value_type':'string','label':'Condición por defecto','description':'Condición inicial al crear producto.'},
    {'group':'products','key':'products.default_unit','value':'unidad','value_type':'string','label':'Unidad por defecto','description':'Unidad predeterminada para productos.'},
    {'group':'products','key':'products.default_offer_discount','value':'10','value_type':'decimal','label':'Descuento oferta %','description':'Porcentaje usado para precio venta/oferta vinculado.'},
    {'group':'products','key':'products.link_prices_default','value':'true','value_type':'boolean','label':'Precios vinculados por defecto','description':'Calcula oferta automáticamente desde precio venta y descuento.'},
    {'group':'products','key':'products.auto_sku','value':'true','value_type':'boolean','label':'SKU automático','description':'Permite sugerir SKU por categoría/serie.'},
    {'group':'products','key':'products.require_engine_series_by_category','value':'true','value_type':'boolean','label':'Serie motor según categoría','description':'La categoría define si la serie motor es obligatoria.'},
    {'group':'sales','key':'sales.warehouse_exit_affects_physical','value':'true','value_type':'boolean','label':'Salida descuenta físico','description':'La salida de bodega reduce existencia física.'},
    {'group':'sales','key':'sales.warehouse_exit_affects_accounting','value':'false','value_type':'boolean','label':'Salida descuenta contable','description':'Normalmente la salida no descuenta contable.'},
    {'group':'sales','key':'sales.invoice_from_exit_affects_physical','value':'false','value_type':'boolean','label':'Factura desde salida descuenta físico','description':'Debe quedar falso para evitar doble descuento físico.'},
    {'group':'sales','key':'sales.invoice_from_exit_affects_accounting','value':'true','value_type':'boolean','label':'Factura desde salida descuenta contable','description':'La factura posterior formaliza la salida en inventario contable.'},
    {'group':'sales','key':'sales.direct_invoice_affects_physical','value':'true','value_type':'boolean','label':'Factura directa descuenta físico','description':'Factura sin salida previa descuenta físico.'},
    {'group':'sales','key':'sales.direct_invoice_affects_accounting','value':'true','value_type':'boolean','label':'Factura directa descuenta contable','description':'Factura sin salida previa descuenta contable.'},
    {'group':'sales','key':'sales.prevent_double_click','value':'true','value_type':'boolean','label':'Evitar doble clic','description':'Bloquea botones al guardar documentos.'},
    {'group':'purchases','key':'purchases.default_status','value':'borrador','value_type':'string','label':'Estado por defecto','description':'Estado inicial recomendado para compras.'},
    {'group':'purchases','key':'purchases.create_lots_on_register','value':'true','value_type':'boolean','label':'Crear lotes al registrar','description':'Los borradores no mueven inventario; al registrar crean lotes.'},
    {'group':'documents','key':'documents.date_format','value':'dd/MM/yyyy','value_type':'string','label':'Fecha en documentos','description':'Formato de fecha para PDF/impresión.'},
    {'group':'documents','key':'documents.show_company_logo','value':'true','value_type':'boolean','label':'Mostrar logo','description':'Usar logo de empresa en imprimibles.'},
    {'group':'documents','key':'documents.default_footer','value':'Gracias por su compra.','value_type':'string','label':'Pie de documento','description':'Texto configurable para documentos.'},
    {'group':'integrations','key':'integrations.woocommerce.enabled','value':'false','value_type':'boolean','label':'WooCommerce activo','description':'Integración desacoplada; puede activarse/desactivarse.'},
    {'group':'integrations','key':'integrations.fel.enabled','value':'false','value_type':'boolean','label':'FEL activo','description':'Integración FEL desacoplada.'},
    {'group':'system','key':'system.audit_enabled','value':'true','value_type':'boolean','label':'Auditoría activa','description':'Registra acciones críticas.'},
    {'group':'system','key':'system.logs_enabled','value':'true','value_type':'boolean','label':'Logs activos','description':'Registra errores/eventos técnicos.'},
    {'group':'system','key':'system.dev_panel_enabled','value':'true','value_type':'boolean','label':'Panel desarrollo','description':'Herramientas visibles en entorno de desarrollo.'},
]

LABELS = {item['key']: item for item in DEFAULT_SETTINGS}
GROUPS = ['company','inventory','products','sales','purchases','documents','integrations','system']


def normalize_value(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, bool):
        return 'true' if value else 'false'
    return str(value)


def write_audit(db: Session, action: str, entity_type: str, entity_id: str, detail: str) -> None:
    if AuditLog is None:
        return
    try:
        db.add(AuditLog(company_id=COMPANY_ID, user_id=None, action=action, entity_type=entity_type, entity_id=entity_id, detail=detail, ip_address='local'))
    except Exception:
        pass


def seed_defaults(db: Session) -> None:
    ensure_default_company(db)
    for item in DEFAULT_SETTINGS:
        exists = db.query(AppSetting).filter(AppSetting.company_id == COMPANY_ID, AppSetting.key == item['key']).first()
        if not exists:
            db.add(AppSetting(company_id=COMPANY_ID, key=item['key'], value=item['value'], value_type=item['value_type'], group=item['group'], is_public=True))
    db.commit()


def reset_defaults(db: Session) -> None:
    ensure_default_company(db)
    changed = 0
    for item in DEFAULT_SETTINGS:
        row = db.query(AppSetting).filter(AppSetting.company_id == COMPANY_ID, AppSetting.key == item['key']).first()
        if row:
            if row.value != item['value']:
                changed += 1
            row.value = item['value']
            row.value_type = item['value_type']
            row.group = item['group']
            row.is_public = True
            row.is_deleted = False
        else:
            changed += 1
            db.add(AppSetting(company_id=COMPANY_ID, key=item['key'], value=item['value'], value_type=item['value_type'], group=item['group'], is_public=True))
    write_audit(db, 'settings.reset', 'app_settings', 'default', f'Restablecimiento de configuración base. Cambios: {changed}')
    db.commit()


def list_settings(db: Session):
    seed_defaults(db)
    rows = db.query(AppSetting).filter(AppSetting.company_id == COMPANY_ID, AppSetting.is_deleted == False).order_by(AppSetting.group, AppSetting.key).all()
    grouped = {g: [] for g in GROUPS}
    for r in rows:
        meta = LABELS.get(r.key, {})
        grouped.setdefault(r.group, []).append({
            'id': r.id,
            'key': r.key,
            'value': r.value,
            'value_type': r.value_type,
            'group': r.group,
            'label': meta.get('label', r.key),
            'description': meta.get('description', ''),
            'is_public': r.is_public,
        })
    return grouped


def update_settings(db: Session, settings: list):
    seed_defaults(db)
    changed_keys: list[str] = []
    for data in settings:
        key = getattr(data, 'key', None)
        if not key:
            continue
        value = normalize_value(getattr(data, 'value', ''))
        value_type = getattr(data, 'value_type', None) or LABELS.get(key, {}).get('value_type', 'string')
        group = getattr(data, 'group', None) or LABELS.get(key, {}).get('group', 'general')
        is_public = bool(getattr(data, 'is_public', False))
        row = db.query(AppSetting).filter(AppSetting.company_id == COMPANY_ID, AppSetting.key == key).first()
        if row:
            if row.value != value or row.value_type != value_type or row.group != group or row.is_public != is_public:
                changed_keys.append(key)
            row.value = value
            row.value_type = value_type
            row.group = group
            row.is_public = is_public
            row.is_deleted = False
        else:
            changed_keys.append(key)
            db.add(AppSetting(company_id=COMPANY_ID, key=key, value=value, value_type=value_type, group=group, is_public=is_public))
    if changed_keys:
        write_audit(db, 'settings.update', 'app_settings', 'bulk', 'Configuraciones modificadas: ' + ', '.join(changed_keys[:30]))
    db.commit()
    return list_settings(db)


def get_public_defaults(db: Session):
    grouped = list_settings(db)
    flat = {item['key']: item['value'] for group in grouped.values() for item in group}
    return {
        'timezone': flat.get('company.timezone','America/Guatemala'),
        'date_format': flat.get('company.date_format','dd/MM/yyyy'),
        'time_format': flat.get('company.time_format','HH:mm:ss'),
        'currency': flat.get('company.currency','GTQ'),
        'tax_rate': float(flat.get('company.tax_rate','12') or 12),
        'offer_discount_percent': float(flat.get('products.default_offer_discount','10') or 10),
        'costs_include_tax': flat.get('inventory.costs_include_tax','true') == 'true',
        'inventory': {
            'available_for_sale_mode': flat.get('inventory.available_for_sale_mode','fisico'),
            'warehouse_exit_affects_physical': flat.get('sales.warehouse_exit_affects_physical','true') == 'true',
            'warehouse_exit_affects_accounting': flat.get('sales.warehouse_exit_affects_accounting','false') == 'true',
            'invoice_from_exit_affects_physical': flat.get('sales.invoice_from_exit_affects_physical','false') == 'true',
            'invoice_from_exit_affects_accounting': flat.get('sales.invoice_from_exit_affects_accounting','true') == 'true',
            'direct_invoice_affects_physical': flat.get('sales.direct_invoice_affects_physical','true') == 'true',
            'direct_invoice_affects_accounting': flat.get('sales.direct_invoice_affects_accounting','true') == 'true',
        }
    }
