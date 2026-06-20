from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.domains.settings.service import COMPANY_ID, ensure_default_company


def scalar(db: Session, sql: str, params: dict | None = None):
    try:
        return db.execute(text(sql), params or {}).scalar() or 0
    except Exception:
        return 0


def rows(db: Session, sql: str, params: dict | None = None):
    try:
        return db.execute(text(sql), params or {}).mappings().all()
    except Exception:
        return []


def dashboard(db: Session):
    ensure_default_company(db)
    now = datetime.now(timezone.utc).isoformat()

    # Indicadores operativos: no crean datos; solo leen el estado real.
    low_stock = scalar(db, """
        SELECT COUNT(*) FROM inventory_lots
        WHERE company_id=:company_id AND is_deleted=false AND is_active=true AND physical_qty <= 1
    """, {'company_id': COMPANY_ID})
    blocked_lots = scalar(db, """
        SELECT COUNT(*) FROM inventory_lots
        WHERE company_id=:company_id AND is_deleted=false AND is_blocked=true
    """, {'company_id': COMPANY_ID})
    pending_exits = scalar(db, """
        SELECT COUNT(*) FROM inventory_warehouse_exits
        WHERE company_id=:company_id AND is_deleted=false AND is_invoiced=false
    """, {'company_id': COMPANY_ID})
    invoices_open = scalar(db, """
        SELECT COUNT(*) FROM sales_invoices
        WHERE company_id=:company_id AND is_deleted=false AND status <> 'anulada'
    """, {'company_id': COMPANY_ID})
    purchases_draft = scalar(db, """
        SELECT COUNT(*) FROM purchases
        WHERE company_id=:company_id AND is_deleted=false AND status='borrador'
    """, {'company_id': COMPANY_ID})
    cash_open = scalar(db, """
        SELECT COUNT(*) FROM cash_sessions
        WHERE company_id=:company_id AND is_deleted=false AND status='abierta'
    """, {'company_id': COMPANY_ID})
    pending_balance = scalar(db, """
        SELECT COALESCE(SUM(balance),0) FROM payments
        WHERE company_id=:company_id AND is_deleted=false AND payment_type='saldo_pendiente'
    """, {'company_id': COMPANY_ID})
    audit_today = scalar(db, """
        SELECT COUNT(*) FROM audit_logs
        WHERE company_id=:company_id AND created_at >= CURRENT_DATE
    """, {'company_id': COMPANY_ID})

    kpis = [
        {'key':'low_stock','label':'Lotes con bajo stock','value':low_stock,'group':'Inventario','severity':'warning' if low_stock else 'success','hint':'Revisar reposición, bloqueo o ajuste físico.'},
        {'key':'blocked_lots','label':'Lotes bloqueados','value':blocked_lots,'group':'Inventario','severity':'warning' if blocked_lots else 'success','hint':'Validar lotes no vendibles.'},
        {'key':'pending_exits','label':'Salidas pendientes de facturar','value':pending_exits,'group':'Comercial','severity':'warning' if pending_exits else 'success','hint':'Facturar salidas para formalizar contable.'},
        {'key':'invoices_open','label':'Facturas activas','value':invoices_open,'group':'Comercial','severity':'info','hint':'Documentos comerciales no anulados.'},
        {'key':'purchases_draft','label':'Compras en borrador','value':purchases_draft,'group':'Compras','severity':'warning' if purchases_draft else 'success','hint':'Registrar compras para crear lotes.'},
        {'key':'cash_open','label':'Cajas abiertas','value':cash_open,'group':'Financiero','severity':'warning' if cash_open else 'info','hint':'Cerrar caja al finalizar el turno.'},
        {'key':'pending_balance','label':'Saldo pendiente','value':float(pending_balance),'group':'Financiero','severity':'warning' if float(pending_balance or 0)>0 else 'success','hint':'Cuentas por cobrar registradas.'},
        {'key':'audit_today','label':'Eventos auditados hoy','value':audit_today,'group':'Sistema','severity':'info','hint':'Acciones relevantes registradas.'},
    ]

    alerts = []
    if low_stock:
        alerts.append({'id':'low_stock','title':'Inventario con bajo stock','description':f'{low_stock} lote(s) requieren revisión de disponibilidad.','severity':'warning','workspace':'Inventario','action':'Abrir Inventario'})
    if pending_exits:
        alerts.append({'id':'pending_exits','title':'Salidas pendientes de facturar','description':f'{pending_exits} salida(s) ya afectaron físico y necesitan factura.','severity':'warning','workspace':'Comercial','action':'Facturar salida'})
    if purchases_draft:
        alerts.append({'id':'purchases_draft','title':'Compras en borrador','description':f'{purchases_draft} compra(s) todavía no crean inventario.','severity':'info','workspace':'Compras','action':'Registrar compra'})
    if cash_open:
        alerts.append({'id':'cash_open','title':'Caja abierta','description':'Hay caja diaria abierta; revisar arqueo/cierre.','severity':'warning','workspace':'Financiero','action':'Cerrar caja'})
    if not alerts:
        alerts.append({'id':'ok','title':'Operación sin alertas críticas','description':'No se detectaron pendientes críticos en los indicadores principales.','severity':'success','workspace':'General','action':'Actualizar'})

    audit_rows = rows(db, """
        SELECT id, created_at, action, entity_type, entity_id, detail, ip_address
        FROM audit_logs
        WHERE company_id=:company_id
        ORDER BY created_at DESC, id DESC
        LIMIT 20
    """, {'company_id': COMPANY_ID})
    timeline = [{
        'id': str(r['id']),
        'timestamp': r['created_at'].isoformat() if hasattr(r['created_at'], 'isoformat') else str(r['created_at']),
        'title': r['action'],
        'detail': r['detail'] or f"{r['entity_type']} #{r['entity_id']}",
        'workspace': infer_workspace(r['entity_type'], r['action']),
        'severity': 'info'
    } for r in audit_rows]

    return {'version':'15.6.0','generated_at':now,'kpis':kpis,'alerts':alerts,'timeline':timeline}


def infer_workspace(entity_type: str, action: str) -> str:
    token = f'{entity_type} {action}'.lower()
    if 'setting' in token or 'permission' in token or 'role' in token:
        return 'Administración'
    if 'invoice' in token or 'sale' in token or 'warehouse_exit' in token:
        return 'Comercial'
    if 'purchase' in token or 'supplier' in token:
        return 'Compras'
    if 'payment' in token or 'cash' in token or 'deposit' in token:
        return 'Financiero'
    if 'product' in token or 'lot' in token or 'kardex' in token:
        return 'Inventario'
    return 'Sistema'


def audit_entries(db: Session):
    ensure_default_company(db)
    audit_rows = rows(db, """
        SELECT id, created_at, action, entity_type, entity_id, detail, ip_address
        FROM audit_logs
        WHERE company_id=:company_id
        ORDER BY created_at DESC, id DESC
        LIMIT 100
    """, {'company_id': COMPANY_ID})
    return [{
        'id': r['id'],
        'created_at': r['created_at'].isoformat() if hasattr(r['created_at'], 'isoformat') else str(r['created_at']),
        'action': r['action'],
        'entity_type': r['entity_type'],
        'entity_id': r['entity_id'],
        'detail': r['detail'],
        'ip_address': r['ip_address'] or '',
    } for r in audit_rows]
