from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from decimal import Decimal
from app.domains.inventory import models as inv
try:
    from app.domains.financial import models as fin
except Exception:  # pragma: no cover
    fin = None

DEFAULT_COMPANY_ID = 1

def _num(value):
    if isinstance(value, Decimal):
        return float(value)
    return value or 0

def _count(db: Session, model, company_id: int = DEFAULT_COMPANY_ID, *extra):
    stmt = select(func.count()).select_from(model).where(model.company_id == company_id)
    if hasattr(model, 'is_deleted'):
        stmt = stmt.where(model.is_deleted == False)
    for item in extra:
        stmt = stmt.where(item)
    return int(db.execute(stmt).scalar() or 0)

def _sum(db: Session, column, model, company_id: int = DEFAULT_COMPANY_ID, *extra):
    stmt = select(func.coalesce(func.sum(column), 0)).select_from(model).where(model.company_id == company_id)
    if hasattr(model, 'is_deleted'):
        stmt = stmt.where(model.is_deleted == False)
    for item in extra:
        stmt = stmt.where(item)
    return float(db.execute(stmt).scalar() or 0)

def _actions_for(entity_type: str, summary: dict | None = None):
    summary = summary or {}
    common = [
        {'key': 'view', 'label': 'Ver detalle', 'icon': '👁️', 'workspace': entity_type, 'description': 'Abrir panel contextual.'},
        {'key': 'audit', 'label': 'Auditoría', 'icon': '📜', 'workspace': 'operations', 'description': 'Ver historial y trazabilidad.'},
    ]
    if entity_type == 'product':
        return [
            {'key': 'new_lot', 'label': 'Crear lote', 'icon': '📦', 'workspace': 'inventory', 'description': 'Crear lote relacionado al producto.'},
            {'key': 'sell', 'label': 'Vender', 'icon': '🛒', 'workspace': 'commercial', 'description': 'Enviar producto al flujo comercial.'},
            {'key': 'purchase', 'label': 'Comprar', 'icon': '📥', 'workspace': 'purchases', 'description': 'Crear compra usando este producto.'},
            {'key': 'media', 'label': 'Fotos', 'icon': '📷', 'workspace': 'multimedia', 'description': 'Gestionar fotografías y archivos.'},
        ] + common
    if entity_type == 'lot':
        return [
            {'key': 'exit', 'label': 'Crear salida', 'icon': '🚚', 'workspace': 'commercial', 'description': 'Preparar entrega física.'},
            {'key': 'invoice', 'label': 'Facturar', 'icon': '🧾', 'workspace': 'commercial', 'description': 'Facturar lote disponible.'},
            {'key': 'disassemble', 'label': 'Desarmar', 'icon': '🧩', 'workspace': 'automotive', 'description': 'Crear desarme parcial/total.', 'enabled': bool(summary.get('is_disassemblable'))},
            {'key': 'label', 'label': 'Etiqueta', 'icon': '🏷️', 'workspace': 'multimedia', 'description': 'Imprimir etiqueta/QR.'},
        ] + common
    if entity_type == 'invoice':
        return [
            {'key': 'print', 'label': 'Imprimir', 'icon': '🖨️', 'workspace': 'documents', 'description': 'Imprimir documento.'},
            {'key': 'collect', 'label': 'Cobrar', 'icon': '💵', 'workspace': 'financial', 'description': 'Registrar cobro o abono.'},
            {'key': 'cancel', 'label': 'Anular', 'icon': '⛔', 'workspace': 'commercial', 'description': 'Anulación controlada.'},
        ] + common
    if entity_type == 'purchase':
        return [
            {'key': 'receive', 'label': 'Recibir', 'icon': '📦', 'workspace': 'purchases', 'description': 'Recepción inteligente y creación de lotes.'},
            {'key': 'print', 'label': 'Imprimir', 'icon': '🖨️', 'workspace': 'documents', 'description': 'Imprimir compra.'},
        ] + common
    return common

def overview(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    products = _count(db, inv.Product, company_id)
    lots = _count(db, inv.Lot, company_id)
    physical = _sum(db, inv.Lot.physical_qty, inv.Lot, company_id)
    accounting = _sum(db, inv.Lot.accounting_qty, inv.Lot, company_id)
    blocked = _count(db, inv.Lot, company_id, inv.Lot.is_blocked == True)
    disassemblable = _count(db, inv.Lot, company_id, inv.Lot.is_disassemblable == True)
    exits_pending = _count(db, inv.WarehouseExit, company_id, inv.WarehouseExit.is_invoiced == False)
    invoices = _count(db, inv.SalesInvoice, company_id)
    purchases = _count(db, inv.Purchase, company_id) if hasattr(inv, 'Purchase') else 0
    customers = _count(db, inv.Customer, company_id)

    alerts = []
    no_lots = max(products - int(db.execute(select(func.count(func.distinct(inv.Lot.product_id))).where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False)).scalar() or 0), 0)
    if no_lots:
        alerts.append({'severity': 'warning', 'title': 'Productos sin lote', 'count': no_lots, 'action': 'Filtrar productos sin lote', 'workspace': 'inventory'})
    if blocked:
        alerts.append({'severity': 'danger', 'title': 'Lotes bloqueados', 'count': blocked, 'action': 'Revisar lotes bloqueados', 'workspace': 'inventory'})
    if exits_pending:
        alerts.append({'severity': 'info', 'title': 'Salidas pendientes de facturar', 'count': exits_pending, 'action': 'Facturar salidas', 'workspace': 'commercial'})

    return {
        'version': '16.5.0',
        'message': 'Centro inteligente para navegar por contexto, acciones rápidas, alertas y búsqueda transversal.',
        'kpis': [
            {'key': 'products', 'label': 'Productos', 'value': products, 'helper': 'Productos activos', 'severity': 'info', 'target_filter': 'productos'},
            {'key': 'lots', 'label': 'Lotes', 'value': lots, 'helper': 'Lotes activos', 'severity': 'info', 'target_filter': 'lotes'},
            {'key': 'physical', 'label': 'Físico', 'value': physical, 'helper': 'Existencia física total', 'severity': 'success', 'target_filter': 'fisico'},
            {'key': 'accounting', 'label': 'Contable', 'value': accounting, 'helper': 'Existencia contable total', 'severity': 'success', 'target_filter': 'contable'},
            {'key': 'pending_exits', 'label': 'Salidas pendientes', 'value': exits_pending, 'helper': 'Pendientes de facturar', 'severity': 'warning', 'target_filter': 'salidas'},
            {'key': 'blocked', 'label': 'Bloqueados', 'value': blocked, 'helper': 'Lotes bloqueados', 'severity': 'danger', 'target_filter': 'bloqueados'},
        ],
        'alerts': alerts,
        'actions': [
            {'key': 'new_sale', 'label': 'Nueva venta', 'icon': '🛒', 'workspace': 'commercial', 'target': '/commercial', 'description': 'Abrir POS / facturación.'},
            {'key': 'new_purchase', 'label': 'Nueva compra', 'icon': '📥', 'workspace': 'purchases', 'target': '/purchases', 'description': 'Registrar compra o recepción.'},
            {'key': 'new_product', 'label': 'Nuevo producto', 'icon': '📦', 'workspace': 'inventory', 'target': '/inventory', 'description': 'Crear producto maestro.'},
            {'key': 'disassembly', 'label': 'Desarme', 'icon': '🧩', 'workspace': 'automotive', 'target': '/automotive', 'description': 'Desarme parcial o total.'},
            {'key': 'label', 'label': 'Etiqueta / QR', 'icon': '🏷️', 'workspace': 'multimedia', 'target': '/multimedia', 'description': 'Imprimir etiquetas y gestionar fotos.'},
        ],
        'inventory_context': {'products': products, 'lots': lots, 'physical_qty': physical, 'accounting_qty': accounting, 'blocked_lots': blocked, 'disassemblable_lots': disassemblable},
        'commercial_context': {'invoices': invoices, 'customers': customers, 'pending_exits': exits_pending},
        'purchases_context': {'purchases': purchases, 'suppliers': _count(db, inv.Supplier, company_id)},
        'automotive_context': {'engine_series': _count(db, inv.EngineSeries, company_id), 'vehicle_models': _count(db, inv.VehicleModel, company_id), 'disassemblable_lots': disassemblable},
    }

def search(db: Session, q: str, company_id: int = DEFAULT_COMPANY_ID, limit: int = 25):
    query = (q or '').strip()
    if not query:
        return {'query': query, 'total': 0, 'results': []}
    like = f'%{query}%'
    results = []

    products = db.execute(select(inv.Product).where(inv.Product.company_id == company_id, inv.Product.is_deleted == False, or_(inv.Product.sku.ilike(like), inv.Product.name.ilike(like), inv.Product.oem_primary.ilike(like), inv.Product.oem_compatible_codes.ilike(like), inv.Product.description.ilike(like))).limit(limit)).scalars().all()
    for p in products:
        summary = {'sku': p.sku, 'price_sale': _num(p.price_sale), 'condition': p.condition, 'product_type': p.product_type, 'oem': p.oem_primary}
        results.append({'entity_type': 'product', 'id': p.id, 'title': p.name, 'subtitle': f'SKU {p.sku} · {p.product_type} · {p.condition}', 'status': 'activo' if p.is_active else 'inactivo', 'summary': summary, 'actions': _actions_for('product', summary)})

    remaining = max(limit - len(results), 0)
    if remaining:
        lots = db.execute(select(inv.Lot).where(inv.Lot.company_id == company_id, inv.Lot.is_deleted == False, or_(inv.Lot.lot_code.ilike(like), inv.Lot.engine_number.ilike(like), inv.Lot.serial_number.ilike(like), inv.Lot.barcode.ilike(like), inv.Lot.qr_code.ilike(like), inv.Lot.notes.ilike(like))).limit(remaining)).scalars().all()
        for lot in lots:
            summary = {'lot_code': lot.lot_code, 'physical_qty': _num(lot.physical_qty), 'accounting_qty': _num(lot.accounting_qty), 'engine_number': lot.engine_number, 'is_disassemblable': lot.is_disassemblable, 'is_blocked': lot.is_blocked}
            results.append({'entity_type': 'lot', 'id': lot.id, 'title': lot.lot_code, 'subtitle': f'Lote · físico {_num(lot.physical_qty)} · contable {_num(lot.accounting_qty)}', 'status': lot.inventory_status, 'summary': summary, 'actions': _actions_for('lot', summary)})

    remaining = max(limit - len(results), 0)
    if remaining:
        invoices = db.execute(select(inv.SalesInvoice).where(inv.SalesInvoice.company_id == company_id, inv.SalesInvoice.is_deleted == False, or_(inv.SalesInvoice.invoice_code.ilike(like), inv.SalesInvoice.client_name.ilike(like), inv.SalesInvoice.client_tax_id.ilike(like), inv.SalesInvoice.notes.ilike(like))).limit(remaining)).scalars().all()
        for doc in invoices:
            summary = {'invoice_code': doc.invoice_code, 'client': doc.client_name, 'total': _num(doc.total), 'status': doc.status}
            results.append({'entity_type': 'invoice', 'id': doc.id, 'title': doc.invoice_code, 'subtitle': f'{doc.client_name} · Total Q{_num(doc.total):,.2f}', 'status': doc.status, 'summary': summary, 'actions': _actions_for('invoice', summary)})

    remaining = max(limit - len(results), 0)
    if remaining:
        customers = db.execute(select(inv.Customer).where(inv.Customer.company_id == company_id, inv.Customer.is_deleted == False, or_(inv.Customer.name.ilike(like), inv.Customer.tax_id.ilike(like), inv.Customer.phone.ilike(like), inv.Customer.email.ilike(like))).limit(remaining)).scalars().all()
        for c in customers:
            summary = {'tax_id': c.tax_id, 'phone': c.phone, 'discount_percent': _num(c.discount_percent), 'price_type': c.price_type}
            results.append({'entity_type': 'customer', 'id': c.id, 'title': c.name, 'subtitle': f'NIT {c.tax_id} · {c.phone or "sin teléfono"}', 'status': 'activo' if c.is_active else 'inactivo', 'summary': summary, 'actions': _actions_for('customer', summary)})

    return {'query': query, 'total': len(results), 'results': results[:limit]}
