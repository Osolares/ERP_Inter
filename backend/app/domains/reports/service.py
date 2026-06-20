from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.domains.inventory import models as inv
from app.domains.financial import models as fin
from app.domains.reports.schemas import ReportKPI, ReportRow, WorkspaceReport, ReportsDashboard


def _count(db: Session, model, *filters) -> int:
    q = db.query(func.count(model.id))
    if hasattr(model, 'is_deleted'):
        q = q.filter(model.is_deleted == False)  # noqa: E712
    for item in filters:
        q = q.filter(item)
    return int(q.scalar() or 0)


def _sum(db: Session, column, model=None, *filters) -> float:
    q = db.query(func.coalesce(func.sum(column), 0))
    if model is not None and hasattr(model, 'is_deleted'):
        q = q.filter(model.is_deleted == False)  # noqa: E712
    for item in filters:
        q = q.filter(item)
    return float(q.scalar() or 0)


def dashboard(db: Session) -> ReportsDashboard:
    products = _count(db, inv.Product)
    lots = _count(db, inv.Lot)
    physical = _sum(db, inv.Lot.physical_qty, inv.Lot)
    accounting = _sum(db, inv.Lot.accounting_qty, inv.Lot)
    invoices = _count(db, inv.SalesInvoice)
    invoice_total = _sum(db, inv.SalesInvoice.total, inv.SalesInvoice)
    purchases = _count(db, inv.Purchase)
    purchase_total = _sum(db, inv.Purchase.total, inv.Purchase)
    payments = _count(db, fin.Payment)
    payments_total = _sum(db, fin.Payment.amount, fin.Payment)
    pending_receivables = max(invoice_total - payments_total, 0)

    kpis = [
        ReportKPI(key='products', label='Productos', value=products, group='Inventario'),
        ReportKPI(key='lots', label='Lotes', value=lots, group='Inventario'),
        ReportKPI(key='physical', label='Existencia física', value=physical, group='Inventario'),
        ReportKPI(key='accounting', label='Existencia contable', value=accounting, group='Inventario'),
        ReportKPI(key='invoices', label='Facturas', value=invoices, group='Comercial'),
        ReportKPI(key='invoice_total', label='Ventas', value=round(invoice_total, 2), suffix='GTQ', group='Comercial'),
        ReportKPI(key='purchases', label='Compras', value=purchases, group='Compras'),
        ReportKPI(key='purchase_total', label='Comprado', value=round(purchase_total, 2), suffix='GTQ', group='Compras'),
        ReportKPI(key='payments_total', label='Cobrado', value=round(payments_total, 2), suffix='GTQ', group='Financiero'),
        ReportKPI(key='pending_receivables', label='Pendiente por cobrar', value=round(pending_receivables, 2), suffix='GTQ', group='Financiero'),
    ]

    low_stock = db.query(func.count(inv.Product.id)).filter(inv.Product.is_deleted == False, inv.Product.stock_min > 0).scalar() or 0  # noqa: E712
    blocked_lots = _count(db, inv.Lot, inv.Lot.is_blocked == True)  # noqa: E712
    out_accounting = _count(db, inv.Lot, inv.Lot.is_out_of_accounting_inventory == True)  # noqa: E712
    pending_exits = _count(db, inv.WarehouseExit, inv.WarehouseExit.is_invoiced == False)  # noqa: E712
    draft_purchases = _count(db, inv.Purchase, inv.Purchase.status == 'borrador')
    open_cash = _count(db, fin.CashSession, fin.CashSession.status == 'abierta')

    workspaces = [
        WorkspaceReport(
            workspace='inventory',
            title='Inventario',
            description='Estado operativo de productos, lotes y existencias.',
            kpis=[k for k in kpis if k.group == 'Inventario'],
            rows=[
                ReportRow(label='Productos registrados', value=products, extra='Maestro de productos'),
                ReportRow(label='Lotes registrados', value=lots, extra='Existencia real en bodega'),
                ReportRow(label='Lotes bloqueados', value=blocked_lots, extra='Requieren revisión'),
                ReportRow(label='Fuera de inventario contable', value=out_accounting, extra='Control físico sin contabilidad'),
                ReportRow(label='Productos con stock mínimo', value=low_stock, extra='Base para alertas de reposición'),
            ]
        ),
        WorkspaceReport(
            workspace='commercial',
            title='Comercial',
            description='Ventas, facturas, salidas y clientes.',
            kpis=[k for k in kpis if k.group == 'Comercial'],
            rows=[
                ReportRow(label='Facturas emitidas', value=invoices, amount=invoice_total),
                ReportRow(label='Total facturado', value=f'Q {invoice_total:,.2f}', amount=invoice_total),
                ReportRow(label='Salidas pendientes de facturar', value=pending_exits, extra='Entregas físicas aún no facturadas'),
            ]
        ),
        WorkspaceReport(
            workspace='purchases',
            title='Compras',
            description='Compras, recepciones, proveedores y costos.',
            kpis=[k for k in kpis if k.group == 'Compras'],
            rows=[
                ReportRow(label='Compras registradas', value=purchases, amount=purchase_total),
                ReportRow(label='Total comprado', value=f'Q {purchase_total:,.2f}', amount=purchase_total),
                ReportRow(label='Borradores pendientes', value=draft_purchases, extra='Compras sin afectar inventario'),
            ]
        ),
        WorkspaceReport(
            workspace='financial',
            title='Financiero',
            description='Caja, cobros, abonos, bancos y saldos pendientes.',
            kpis=[k for k in kpis if k.group == 'Financiero'],
            rows=[
                ReportRow(label='Cobros registrados', value=payments, amount=payments_total),
                ReportRow(label='Total cobrado', value=f'Q {payments_total:,.2f}', amount=payments_total),
                ReportRow(label='Pendiente por cobrar', value=f'Q {pending_receivables:,.2f}', amount=pending_receivables),
                ReportRow(label='Cajas abiertas', value=open_cash, extra='Revisar antes de cerrar día'),
            ]
        ),
    ]

    return ReportsDashboard(
        version='15.6.0',
        generated_at=datetime.now(timezone.utc).isoformat(),
        kpis=kpis,
        workspaces=workspaces,
    )
