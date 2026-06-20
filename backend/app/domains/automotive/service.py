from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.domains.inventory import models as inv
from app.domains.automotive.schemas import (
    AutomotiveMetric, FieldSpec, BusinessRule, ProductAutomationPreviewRequest,
    ProductAutomationPreview, AutomotiveOverview, AutomationRule, CompatibilityTemplate,
    SkuRulePreview, SkuRuleResult, CompatibilityPreviewRequest, CompatibilityPreview,
    DocumentDescriptionRequest, DocumentDescriptionResult, AutomotiveSearchRequest, AutomotiveSearchResponse,
    AutomotiveSearchResult, OemNormalizeRequest, OemNormalizeResult, ProductLotAssistantRequest, ProductLotAssistantResult,
)

DEFAULT_COMPANY_ID = 1


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def product_field_specs() -> list[FieldSpec]:
    return [
        FieldSpec(field='sku', label='SKU', source='v15 + regla mejorada v13', input_type='texto con generación asistida', required=True, notes='Debe ser único. Sugerido por categoría + serie motor + característica.'),
        FieldSpec(field='name', label='Nombre del producto', source='v13', input_type='texto', required=True, notes='Nombre comercial claro para documentos, POS y Woo futuro.'),
        FieldSpec(field='short_name', label='Nombre corto', source='v13', input_type='texto', notes='Útil para POS, etiquetas y tablas compactas.'),
        FieldSpec(field='product_type', label='Tipo', source='v13/v15', input_type='selector con búsqueda', required=True, notes='Motor, repuesto, accesorio, kit, servicio.'),
        FieldSpec(field='condition', label='Condición', source='v13', input_type='selector', required=True, notes='Nuevo, usado, reconstruido/importado. Vive en producto, no en lote.'),
        FieldSpec(field='main_category_id', label='Categoría principal', source='requerimiento v14', input_type='selector buscable', required=True, notes='Ejemplo: motores, repuestos, servicios.'),
        FieldSpec(field='product_category_id', label='Categoría producto', source='requerimiento v14', input_type='selector buscable + crear en drawer', required=True, notes='Categoría operativa. Define reglas de lote, serie, desarme, inventario.'),
        FieldSpec(field='additional_category_ids', label='Categorías adicionales', source='v13 Woo funcional', input_type='chips múltiple', notes='Debe mantenerse para publicación futura y filtros.'),
        FieldSpec(field='characteristic_tags', label='Características / variante', source='v13', input_type='chips', notes='Ejemplo: culata completa, con válvulas, turbo, automático, mecánico.'),
        FieldSpec(field='brand_id', label='Marca', source='v13', input_type='autocomplete', autocomplete='serie motor puede autocompletar marca'),
        FieldSpec(field='engine_series_id', label='Serie de motor', source='v13 crítico', input_type='autocomplete', required=True, autocomplete='completa marca, combustible, CC, cilindros y prefijo SKU'),
        FieldSpec(field='fuel_type', label='Combustible', source='v13', input_type='autorrelleno editable', autocomplete='serie motor'),
        FieldSpec(field='displacement_cc', label='C.C.', source='v13', input_type='autorrelleno editable', autocomplete='serie motor'),
        FieldSpec(field='cylinders', label='Cilindros', source='v13', input_type='autorrelleno editable', autocomplete='serie motor'),
        FieldSpec(field='oem_primary', label='OEM principal', source='v13', input_type='texto/búsqueda'),
        FieldSpec(field='oem_compatible_codes', label='OEM compatibles', source='v13', input_type='chips múltiple'),
        FieldSpec(field='compatible_brand', label='Marca compatible', source='v13', input_type='autocomplete'),
        FieldSpec(field='compatible_model', label='Modelo/línea compatible', source='v13', input_type='autocomplete dependiente de marca'),
        FieldSpec(field='year_from/year_to', label='Años compatibles', source='v13', input_type='rango'),
        FieldSpec(field='price_sale', label='Precio venta', source='v13', input_type='moneda GTQ', notes='Si precios vinculados está activo recalcula precio oferta.'),
        FieldSpec(field='price_offer', label='Precio oferta', source='v13', input_type='moneda GTQ', notes='Si se edita, recalcula precio venta con porcentaje configurado.'),
        FieldSpec(field='description', label='Descripción', source='v13', input_type='textarea con plantilla'),
        FieldSpec(field='internal_notes', label='Comentarios internos', source='requerimiento v14', input_type='textarea privado'),
        FieldSpec(field='sale_notes', label='Notas para venta/documentos', source='v13 documentos', input_type='textarea'),
    ]


def lot_field_specs() -> list[FieldSpec]:
    return [
        FieldSpec(field='product_id', label='Producto', source='v15', input_type='autocomplete', required=True),
        FieldSpec(field='warehouse_id', label='Bodega', source='v15', input_type='selector buscable', required=True, notes='Por defecto CENTRAL si no se define otra.'),
        FieldSpec(field='lot_code', label='Código lote', source='v13 crítico', input_type='autogenerado editable', required=True, notes='Para motores puede usar número motor; para repuestos SKU + correlativo.'),
        FieldSpec(field='engine_number', label='Número de motor', source='v13', input_type='texto único cuando aplica'),
        FieldSpec(field='barcode/qr_code', label='Código barras / QR', source='v13', input_type='autogenerado'),
        FieldSpec(field='location', label='Ubicación', source='v13', input_type='selector/ubicación jerárquica'),
        FieldSpec(field='physical_qty', label='Existencia física', source='v15 mejorado', input_type='calculado por movimientos', notes='No debe editarse libremente salvo carga inicial/regularización.'),
        FieldSpec(field='accounting_qty', label='Existencia contable', source='v15 mejorado', input_type='calculado por movimientos'),
        FieldSpec(field='reserved_qty', label='Reservado', source='v13/v15', input_type='calculado'),
        FieldSpec(field='pending_exit_qty', label='Pendiente de facturar', source='v13/v15', input_type='calculado'),
        FieldSpec(field='unit_cost', label='Costo unitario', source='requerimiento v14', input_type='moneda', notes='Costo con IVA incluido por defecto.'),
        FieldSpec(field='is_out_of_accounting_inventory', label='Fuera inventario contable', source='v13 funcional', input_type='switch con proceso controlado'),
        FieldSpec(field='is_disassemblable', label='Desarmable', source='v13 funcional', input_type='switch con permisos'),
        FieldSpec(field='parent_lot_id', label='Lote padre', source='v13 desarmes', input_type='relación'),
        FieldSpec(field='notes', label='Notas del lote', source='requerimiento v14', input_type='textarea'),
    ]


def document_rules() -> list[BusinessRule]:
    return [
        BusinessRule(code='DOC-DESC-001', title='Descripción automática editable', area='facturas/salidas/cotizaciones', description='La línea del documento debe sugerir descripción con SKU, nombre, condición, serie, OEM, lote y número de motor cuando aplique. El usuario puede editar antes de guardar.', applies_to=['Factura', 'Salida', 'Cotización']),
        BusinessRule(code='DOC-DISC-001', title='Descuentos por línea y generales', area='ventas', description='Mantener descuento por línea, descuento general y descuento especial por cliente. Todo debe quedar auditado y visible en impresión.', applies_to=['Factura', 'POS', 'Cotización']),
        BusinessRule(code='DOC-IDEMP-001', title='Anti doble clic / idempotencia', area='documentos', description='Guardar documentos debe bloquear doble envío y usar llave de idempotencia para evitar facturas/salidas duplicadas.', applies_to=['Factura', 'Salida', 'Compra', 'Cotización']),
        BusinessRule(code='INV-PHYS-001', title='Salida descuenta físico', area='inventario', description='Salida de bodega descuenta existencia física y deja pendiente contable hasta facturar.', applies_to=['Salida']),
        BusinessRule(code='INV-ACC-001', title='Factura desde salida descuenta contable', area='inventario', description='La factura generada desde salida no descuenta físico otra vez; solo descuenta contable.', applies_to=['Factura']),
        BusinessRule(code='QUOTE-001', title='Cotización no mueve inventario', area='cotizaciones', description='Cotización no afecta físico ni contable, salvo reserva explícita configurada.', applies_to=['Cotización']),
        BusinessRule(code='PRICE-001', title='Precio venta/oferta vinculado', area='precios', description='Con vínculo activo: venta calcula oferta restando % descuento; oferta calcula venta multiplicando por 1 + descuento.', applies_to=['Producto', 'POS', 'Factura']),
    ]


def disassembly_rules() -> list[BusinessRule]:
    return [
        BusinessRule(code='DIS-001', title='Desarme como documento formal', area='desarmes', description='Un desarme debe tener encabezado, estado, responsable, motivo, lote padre, líneas hijas, costos, Kardex y auditoría.', applies_to=['Lote', 'Kardex']),
        BusinessRule(code='DIS-002', title='Desarme parcial o total', area='desarmes', description='Debe permitir consumir una parte de la existencia física/contable del lote padre o cerrarlo completamente.', applies_to=['Lote padre']),
        BusinessRule(code='DIS-003', title='Distribución de costos', area='desarmes', description='El costo del lote padre se distribuye a lotes hijos por costo manual validado, porcentaje o valor sugerido.', applies_to=['Lotes hijos']),
        BusinessRule(code='DIS-004', title='Reversión controlada', area='desarmes', description='Un desarme solo se revierte si ningún lote hijo tuvo movimientos posteriores.', applies_to=['Auditoría', 'Kardex']),
    ]


def automation_rules() -> list[AutomationRule]:
    return [
        AutomationRule(code='AUTO-SERIE-001', title='Serie motor autocompleta datos técnicos', trigger='Al seleccionar serie motor', actions=['marca sugerida', 'combustible', 'C.C.', 'cilindros', 'prefijo SKU', 'equivalencias']),
        AutomationRule(code='AUTO-CAT-001', title='Categoría define comportamiento', trigger='Al seleccionar categoría producto', actions=['requiere lote', 'requiere serie motor', 'maneja inventario', 'permite desarme', 'prefijo SKU']),
        AutomationRule(code='AUTO-SKU-001', title='SKU inteligente configurable', trigger='Al crear producto', actions=['prefijo categoría', 'prefijo serie', 'condición', 'característica', 'correlativo']),
        AutomationRule(code='AUTO-PRICE-001', title='Precio venta/oferta vinculado', trigger='Al modificar precio venta u oferta', actions=['calcular oferta', 'calcular venta inversa', 'mostrar margen estimado']),
        AutomationRule(code='AUTO-DOC-001', title='Descripción automática editable', trigger='Al agregar línea a factura/salida/cotización', actions=['SKU', 'producto', 'condición', 'serie', 'OEM', 'lote', 'número motor']),
    ]


def compatibility_templates(db: Session, company_id: int = DEFAULT_COMPANY_ID) -> list[CompatibilityTemplate]:
    series_rows = db.execute(
        select(inv.EngineSeries)
        .where(inv.EngineSeries.company_id == company_id, inv.EngineSeries.is_deleted == False)
        .order_by(inv.EngineSeries.code)
        .limit(12)
    ).scalars().all()
    templates: list[CompatibilityTemplate] = []
    for s in series_rows:
        brand = s.brand_name or 'Marca pendiente'
        templates.append(CompatibilityTemplate(
            brand=brand,
            model='Línea/modelo sugerido',
            generation='Generación por definir',
            year_from='',
            year_to='',
            engine_series=s.code,
            fuel_type=s.fuel_type,
            displacement_cc=s.displacement_cc,
            observations='Compatibilidad sugerida por serie de motor. Validar antes de publicar o imprimir.',
        ))
    if not templates:
        templates = [
            CompatibilityTemplate(brand='Hyundai/Kia', model='H1 / Porter / Sorento', generation='Según mercado', year_from='', year_to='', engine_series='D4CB', fuel_type='Diésel', displacement_cc='2500', observations='Plantilla base sugerida; validar por VIN o catálogo.'),
            CompatibilityTemplate(brand='Mitsubishi', model='L200 / Montero', generation='Según mercado', year_from='', year_to='', engine_series='4D56', fuel_type='Diésel', displacement_cc='2500', observations='Plantilla base sugerida; validar por versión.'),
            CompatibilityTemplate(brand='Toyota', model='Hilux / Hiace', generation='Según mercado', year_from='', year_to='', engine_series='3L/5L', fuel_type='Diésel', displacement_cc='2800/3000', observations='Plantilla base sugerida; validar por año.'),
        ]
    return templates


def preview_sku_rule(data: SkuRulePreview) -> SkuRuleResult:
    parts: list[str] = []
    explanation: list[str] = []
    if data.condition.lower().startswith('us') or data.condition.lower().startswith('u'):
        parts.append('u')
        explanation.append('Prefijo u por producto usado.')
    elif data.condition:
        parts.append('n')
        explanation.append('Prefijo n por producto nuevo/reconstruido.')
    if data.category_prefix:
        parts.append(data.category_prefix.strip().upper())
        explanation.append(f'Categoría aporta {data.category_prefix.strip().upper()}.')
    if data.engine_prefix:
        parts.append(data.engine_prefix.strip().upper())
        explanation.append(f'Serie motor aporta {data.engine_prefix.strip().upper()}.')
    if data.characteristic:
        clean = ''.join(ch for ch in data.characteristic.upper().replace(' ', '-') if ch.isalnum() or ch == '-')[:18]
        if clean:
            parts.append(clean)
            explanation.append('Característica aporta diferenciador del producto.')
    suffix = str(max(data.sequence, 1)).zfill(3)
    sku = '-'.join([p for p in parts if p]) + f'-{suffix}'
    lot_code = f'{sku}-L01'
    explanation.append('Correlativo asegura trazabilidad sin usar stock en producto maestro.')
    return SkuRuleResult(sku=sku, lot_code_suggestion=lot_code, explanation=explanation)


def preview_compatibility(db: Session, data: CompatibilityPreviewRequest, company_id: int = DEFAULT_COMPANY_ID) -> CompatibilityPreview:
    warnings: list[str] = []
    series = None
    if data.engine_series_code:
        series = db.execute(select(inv.EngineSeries).where(inv.EngineSeries.company_id == company_id, func.lower(inv.EngineSeries.code) == data.engine_series_code.lower(), inv.EngineSeries.is_deleted == False)).scalar_one_or_none()
    if data.engine_series_code and not series:
        warnings.append('Serie de motor no encontrada; se devuelven plantillas generales.')
    suggested = []
    for t in compatibility_templates(db, company_id):
        if series and t.engine_series.lower() != series.code.lower():
            continue
        if data.brand and data.brand.lower() not in t.brand.lower():
            continue
        suggested.append(t)
    if not suggested and series:
        suggested.append(CompatibilityTemplate(
            brand=series.brand_name or data.brand or 'Marca pendiente',
            model=data.model or 'Modelo pendiente',
            year_from=data.year_from,
            year_to=data.year_to,
            engine_series=series.code,
            fuel_type=series.fuel_type,
            displacement_cc=series.displacement_cc,
            observations='Compatibilidad generada desde serie. Revisar y completar antes de guardar.',
        ))
    return CompatibilityPreview(engine_series_code=data.engine_series_code, suggested=suggested[:20], warnings=warnings)


def build_document_description(data: DocumentDescriptionRequest) -> DocumentDescriptionResult:
    parts: list[str] = []
    parts_used: list[str] = []
    def add(label: str, value: str, prefix: str = ''):
        v = (value or '').strip()
        if v:
            parts.append(f'{prefix}{v}' if prefix else v)
            parts_used.append(label)
    add('SKU', data.sku, 'SKU ')
    add('Producto', data.product_name)
    add('Condición', data.condition)
    add('Serie', data.engine_series, 'Serie ')
    add('OEM', data.oem, 'OEM ')
    add('Lote', data.lot_code, 'Lote ')
    add('Número motor', data.engine_number, 'No. motor ')
    add('Notas', data.notes)
    description = ' | '.join(parts) if parts else 'Descripción pendiente de completar'
    return DocumentDescriptionResult(description=description, parts_used=parts_used)


def overview(db: Session, company_id: int = DEFAULT_COMPANY_ID) -> AutomotiveOverview:
    products = db.scalar(select(func.count(inv.Product.id)).where(inv.Product.company_id == company_id, inv.Product.is_deleted == False)) or 0
    lots = db.scalar(select(func.count(inv.Lot.id)).where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False)) or 0
    series = db.scalar(select(func.count(inv.EngineSeries.id)).where(inv.EngineSeries.company_id == company_id, inv.EngineSeries.is_deleted == False)) or 0
    disassemblable = db.scalar(select(func.count(inv.Lot.id)).where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False, inv.Lot.is_disassemblable == True)) or 0
    out_accounting = db.scalar(select(func.count(inv.Lot.id)).where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False, inv.Lot.is_out_of_accounting_inventory == True)) or 0
    return AutomotiveOverview(
        metrics=[
            AutomotiveMetric(label='Productos', value=products, hint='Producto maestro sin stock directo'),
            AutomotiveMetric(label='Lotes', value=lots, hint='Existencia física/contable vive en lotes'),
            AutomotiveMetric(label='Series motor', value=series, hint='Base de autocompletados automotrices'),
            AutomotiveMetric(label='Desarmables', value=disassemblable, hint='Candidatos a documento de desarme'),
            AutomotiveMetric(label='Fuera contable', value=out_accounting, hint='Control operativo separado de inventario valorizado'),
        ],
        product_fields=product_field_specs(),
        lot_fields=lot_field_specs(),
        document_rules=document_rules(),
        disassembly_rules=disassembly_rules(),
        automation_rules=automation_rules(),
        compatibility_templates=compatibility_templates(db, company_id),
        v13_lessons=[
            'Rescatar flujos que funcionaban, pero no copiar código ni arquitectura de v13.',
            'WooCommerce debe quedar desacoplado: si falla, no debe dañar productos, lotes, inventario, ventas ni compras.',
            'El stock nunca vive en producto maestro; vive en lotes y movimientos.',
            'Salidas, facturas y cotizaciones necesitan reglas claras de descripción, descuentos e idempotencia.',
            'Los desarmes deben ser documentos auditables, no una operación informal.',
        ],
    )


def preview_product_automation(db: Session, data: ProductAutomationPreviewRequest, company_id: int = DEFAULT_COMPANY_ID) -> ProductAutomationPreview:
    series = None
    if data.engine_series_code:
        series = db.execute(select(inv.EngineSeries).where(inv.EngineSeries.company_id == company_id, inv.EngineSeries.code == data.engine_series_code, inv.EngineSeries.is_deleted == False)).scalar_one_or_none()
    category = None
    if data.category_name:
        category = db.execute(select(inv.Category).where(inv.Category.company_id == company_id, func.lower(inv.Category.name) == data.category_name.lower(), inv.Category.is_deleted == False)).scalar_one_or_none()

    prefix_parts = []
    if category and category.sku_prefix:
        prefix_parts.append(category.sku_prefix.upper())
    if series and series.sku_prefix:
        prefix_parts.append(series.sku_prefix.upper())
    elif series:
        prefix_parts.append(series.code.upper())
    base_sku = data.sku.strip() or '-'.join(prefix_parts) or 'SKU-PENDIENTE'

    sale = Decimal(data.price_sale or 0)
    offer = Decimal(data.price_offer or 0)
    discount = Decimal(data.discount_percent or 10)
    if data.prices_linked:
        if sale > 0:
            offer = _money(sale * (Decimal('1') - (discount / Decimal('100'))))
        elif offer > 0:
            sale = _money(offer * (Decimal('1') + (discount / Decimal('100'))))

    rules = []
    warnings = []
    if category:
        if category.requires_engine_series:
            rules.append('Requiere serie de motor')
            if not series:
                warnings.append('La categoría requiere serie de motor y aún no se seleccionó una.')
        if category.handles_inventory:
            rules.append('Maneja inventario por lotes')
        else:
            rules.append('Puede operar fuera de inventario')
    else:
        warnings.append('Categoría no encontrada: se aplicarán reglas por defecto.')

    suggested_name = data.name.strip()
    if not suggested_name:
        suggested_name = 'Producto automotriz'
    if series and series.code.upper() not in suggested_name.upper():
        suggested_name = f'{suggested_name} {series.code}'.strip()

    description = ' '.join([part for part in [suggested_name, f'Serie {series.code}' if series else '', series.fuel_type if series else '', series.displacement_cc if series else ''] if part])
    return ProductAutomationPreview(
        suggested_sku=base_sku,
        suggested_name=suggested_name,
        fuel_type=series.fuel_type if series else '',
        displacement_cc=series.displacement_cc if series else '',
        cylinders=series.cylinders if series else '',
        brand_name=series.brand_name if series else '',
        category_rules=rules,
        price_sale=sale,
        price_offer=offer,
        description_template=description,
        warnings=warnings,
    )


def _clean_token(value: str) -> str:
    return ''.join(ch for ch in (value or '').upper().strip() if ch.isalnum())


def normalize_oem(data: OemNormalizeRequest) -> OemNormalizeResult:
    raw_codes = []
    if data.oem_primary:
        raw_codes.append(data.oem_primary)
    if data.oem_compatible_codes:
        for part in data.oem_compatible_codes.replace(';', ',').replace('|', ',').split(','):
            if part.strip():
                raw_codes.append(part.strip())
    normalized_codes: list[str] = []
    warnings: list[str] = []
    for code in raw_codes:
        cleaned = _clean_token(code)
        if not cleaned:
            continue
        if cleaned not in normalized_codes:
            normalized_codes.append(cleaned)
    primary = _clean_token(data.oem_primary) if data.oem_primary else (normalized_codes[0] if normalized_codes else '')
    compatible = [code for code in normalized_codes if code != primary]
    if not primary:
        warnings.append('No se indicó OEM principal.')
    if len(raw_codes) != len(normalized_codes):
        warnings.append('Se eliminaron OEM repetidos o vacíos.')
    return OemNormalizeResult(primary=primary, compatible=compatible, normalized=', '.join(normalized_codes), warnings=warnings)


def automotive_global_search(db: Session, data: AutomotiveSearchRequest, company_id: int = DEFAULT_COMPANY_ID) -> AutomotiveSearchResponse:
    term = (data.query or '').strip()
    limit = max(1, min(int(data.limit or 20), 50))
    results: list[AutomotiveSearchResult] = []
    suggestions: list[str] = []
    if not term:
        return AutomotiveSearchResponse(query=term, total=0, results=[], suggestions=['Escribe SKU, OEM, serie, número motor, lote, modelo o descripción.'])
    like = f'%{term}%'

    products = db.execute(
        select(inv.Product)
        .where(inv.Product.company_id == company_id, inv.Product.is_deleted == False)
        .where(
            (inv.Product.sku.ilike(like)) |
            (inv.Product.name.ilike(like)) |
            (inv.Product.oem_primary.ilike(like)) |
            (inv.Product.oem_compatible_codes.ilike(like)) |
            (inv.Product.description.ilike(like)) |
            (inv.Product.internal_notes.ilike(like)) |
            (inv.Product.compatible_model.ilike(like)) |
            (inv.Product.compatible_brand.ilike(like))
        )
        .limit(limit)
    ).scalars().all()
    for p in products:
        results.append(AutomotiveSearchResult(
            entity='producto', id=p.id, title=p.name, subtitle=f'SKU {p.sku} · {p.condition} · {p.product_type}',
            code=p.sku, status='activo' if p.is_active else 'inactivo', action_hint='Abrir producto, crear lote, facturar o ver Kardex'
        ))

    lots = db.execute(
        select(inv.Lot)
        .where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False)
        .where(
            (inv.Lot.lot_code.ilike(like)) |
            (inv.Lot.barcode.ilike(like)) |
            (inv.Lot.qr_code.ilike(like)) |
            (inv.Lot.engine_number.ilike(like)) |
            (inv.Lot.serial_number.ilike(like)) |
            (inv.Lot.location.ilike(like)) |
            (inv.Lot.notes.ilike(like))
        )
        .limit(limit)
    ).scalars().all()
    for l in lots:
        results.append(AutomotiveSearchResult(
            entity='lote', id=l.id, title=l.lot_code, subtitle=f'Producto #{l.product_id} · físico {l.physical_qty} · contable {l.accounting_qty}',
            code=l.engine_number or l.barcode or l.qr_code, status=l.inventory_status, action_hint='Vender, crear salida, desarmar o imprimir etiqueta'
        ))

    series = db.execute(
        select(inv.EngineSeries)
        .where(inv.EngineSeries.company_id == company_id, inv.EngineSeries.is_deleted == False)
        .where(
            (inv.EngineSeries.code.ilike(like)) |
            (inv.EngineSeries.name.ilike(like)) |
            (inv.EngineSeries.brand_name.ilike(like)) |
            (inv.EngineSeries.equivalent_series.ilike(like))
        )
        .limit(limit)
    ).scalars().all()
    for e in series:
        results.append(AutomotiveSearchResult(
            entity='serie_motor', id=e.id, title=e.code, subtitle=f'{e.brand_name} · {e.fuel_type} · {e.displacement_cc} · {e.cylinders} cilindros',
            code=e.sku_prefix or e.code, status='activa' if e.is_active else 'inactiva', action_hint='Usar para autocompletar producto, SKU y compatibilidades'
        ))

    models = db.execute(
        select(inv.VehicleModel)
        .where(inv.VehicleModel.company_id == company_id, inv.VehicleModel.is_deleted == False)
        .where(inv.VehicleModel.name.ilike(like))
        .limit(limit)
    ).scalars().all()
    for m in models:
        results.append(AutomotiveSearchResult(
            entity='modelo_linea', id=m.id, title=m.name, subtitle=f'Marca ID {m.brand_id}',
            code=str(m.brand_id), status='activo' if m.is_active else 'inactivo', action_hint='Usar en compatibilidades'
        ))

    if not results:
        suggestions.extend(['Crear producto nuevo', 'Crear serie motor', 'Agregar OEM compatible', 'Revisar búsqueda sin guiones o espacios'])
    return AutomotiveSearchResponse(query=term, total=len(results[:limit]), results=results[:limit], suggestions=suggestions)


def product_lot_assistant(db: Session, data: ProductLotAssistantRequest, company_id: int = DEFAULT_COMPANY_ID) -> ProductLotAssistantResult:
    preview = preview_product_automation(db, ProductAutomationPreviewRequest(
        sku=data.sku,
        name=data.product_name,
        category_name=data.category_name,
        engine_series_code=data.engine_series_code,
        price_sale=data.sale_price,
        price_offer=Decimal('0'),
        discount_percent=Decimal('10'),
        prices_linked=True,
    ), company_id=company_id)
    sku_preview = preview_sku_rule(SkuRulePreview(
        category_prefix=(data.category_name[:3] if data.category_name else 'PRO').upper(),
        engine_prefix=data.engine_series_code.upper(),
        condition=data.condition,
        characteristic=data.product_name,
        sequence=1,
    ))
    required_fields = ['Producto', 'SKU', 'Categoría producto', 'Bodega', 'Costo unitario con IVA incluido']
    warnings = list(preview.warnings)
    if data.engine_series_code and not data.engine_number and 'MOT' in sku_preview.sku.upper():
        required_fields.append('Número de motor')
        warnings.append('Para motores conviene registrar número de motor y usarlo como código lote si aplica.')
    if Decimal(data.unit_cost or 0) <= 0:
        warnings.append('El costo unitario está en cero. Revisar antes de vender o calcular utilidad.')
    lot_code = data.lot_code.strip() or (data.engine_number.strip() if data.engine_number else sku_preview.lot_code_suggestion)
    next_actions = ['Guardar producto', 'Crear lote inicial', 'Imprimir etiqueta/QR', 'Revisar compatibilidades']
    if 'DES' in sku_preview.sku.upper() or 'MOT' in sku_preview.sku.upper():
        next_actions.append('Evaluar si el lote será desarmable')
    return ProductLotAssistantResult(
        product_summary={
            'sku_sugerido': preview.suggested_sku if data.sku else sku_preview.sku,
            'nombre_sugerido': preview.suggested_name,
            'marca': preview.brand_name,
            'combustible': preview.fuel_type,
            'cc': preview.displacement_cc,
            'cilindros': preview.cylinders,
            'precio_venta': str(preview.price_sale),
            'precio_oferta': str(preview.price_offer),
        },
        lot_summary={
            'codigo_lote_sugerido': lot_code,
            'costo_unitario_con_iva': str(_money(Decimal(data.unit_cost or 0))),
            'cantidad_inicial': str(data.quantity),
            'requiere_numero_motor': 'Número de motor' in required_fields,
        },
        required_fields=required_fields,
        warnings=warnings,
        next_actions=next_actions,
    )
