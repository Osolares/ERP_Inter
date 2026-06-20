from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.domains.financial import models
from app.domains.inventory.models import SalesInvoice

DEFAULT_COMPANY_ID = 1

def dec(value):
    return Decimal(str(value or 0))

def next_code(db: Session, model, prefix: str, company_id: int = DEFAULT_COMPANY_ID):
    count = db.scalar(select(func.count(model.id)).where(model.company_id == company_id)) or 0
    return f'{prefix}-{count + 1:06d}'

def open_cash_session(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    current = db.scalar(select(models.CashSession).where(models.CashSession.company_id == company_id, models.CashSession.status == 'abierta', models.CashSession.is_deleted == False).order_by(models.CashSession.id.desc()))
    if current:
        return current
    item = models.CashSession(company_id=company_id, session_code=next_code(db, models.CashSession, 'CAJA', company_id), cashier_name=data.cashier_name or 'Administrador', status='abierta', opening_amount=data.opening_amount, expected_amount=data.opening_amount, notes=data.notes or '')
    db.add(item); db.commit(); db.refresh(item); return item

def list_cash_sessions(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return list(db.scalars(select(models.CashSession).where(models.CashSession.company_id == company_id, models.CashSession.is_deleted == False).order_by(models.CashSession.id.desc())).all())

def close_cash_session(db: Session, session_id: int, data, company_id: int = DEFAULT_COMPANY_ID):
    item = db.get(models.CashSession, session_id)
    if not item or item.company_id != company_id or item.is_deleted:
        raise ValueError('Caja no encontrada.')
    if item.status == 'cerrada':
        return item
    recalc_cash_session(db, item)
    item.counted_amount = data.counted_amount
    item.difference_amount = dec(data.counted_amount) - dec(item.expected_amount)
    item.status = 'cerrada'
    item.closed_at = datetime.now(timezone.utc)
    if data.notes:
        item.notes = (item.notes + '\n' + data.notes).strip()
    db.commit(); db.refresh(item); return item

def list_payments(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return list(db.scalars(select(models.Payment).where(models.Payment.company_id == company_id, models.Payment.is_deleted == False).order_by(models.Payment.id.desc())).all())

def create_payment(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    amount = dec(data.amount)
    if amount <= 0:
        raise ValueError('El monto del cobro debe ser mayor que cero.')
    invoice = None
    if data.invoice_id:
        invoice = db.get(SalesInvoice, data.invoice_id)
        if not invoice or invoice.company_id != company_id or invoice.is_deleted:
            raise ValueError('Factura no encontrada.')
        if invoice.status == 'anulada':
            raise ValueError('No se puede cobrar una factura anulada.')
    session_id = data.cash_session_id
    if not session_id:
        open_session = db.scalar(select(models.CashSession).where(models.CashSession.company_id == company_id, models.CashSession.status == 'abierta', models.CashSession.is_deleted == False).order_by(models.CashSession.id.desc()))
        session_id = open_session.id if open_session else None
    item = models.Payment(company_id=company_id, payment_code=next_code(db, models.Payment, 'COB', company_id), invoice_id=data.invoice_id, cash_session_id=session_id, customer_name=(invoice.client_name if invoice else data.customer_name) or 'Consumidor final', customer_tax_id=(invoice.client_tax_id if invoice else data.customer_tax_id) or 'CF', method=data.method, payment_type=data.payment_type, status='aplicado', amount=amount, reference=data.reference or '', notes=data.notes or '')
    db.add(item); db.flush()
    if invoice:
        paid = invoice_paid(db, invoice.id, company_id) + amount
        balance = dec(invoice.total) - paid
        if balance <= 0:
            invoice.status = 'pagada'
        elif paid > 0:
            invoice.status = 'parcial'
    if session_id:
        session = db.get(models.CashSession, session_id)
        if session and session.status == 'abierta':
            recalc_cash_session(db, session, extra=amount if data.method == 'efectivo' else Decimal('0'))
    db.commit(); db.refresh(item); return item

def invoice_paid(db: Session, invoice_id: int, company_id: int = DEFAULT_COMPANY_ID):
    return dec(db.scalar(select(func.coalesce(func.sum(models.Payment.amount), 0)).where(models.Payment.company_id == company_id, models.Payment.invoice_id == invoice_id, models.Payment.status == 'aplicado', models.Payment.is_deleted == False)))

def recalc_cash_session(db: Session, session, extra: Decimal = Decimal('0')):
    cash_payments = dec(db.scalar(select(func.coalesce(func.sum(models.Payment.amount), 0)).where(models.Payment.company_id == session.company_id, models.Payment.cash_session_id == session.id, models.Payment.method == 'efectivo', models.Payment.status == 'aplicado', models.Payment.is_deleted == False)))
    session.expected_amount = dec(session.opening_amount) + cash_payments + extra
    return session

def receivables(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    invoices = db.scalars(select(SalesInvoice).where(SalesInvoice.company_id == company_id, SalesInvoice.is_deleted == False).order_by(SalesInvoice.id.desc())).all()
    rows = []
    for inv in invoices:
        if inv.status == 'anulada':
            continue
        paid = invoice_paid(db, inv.id, company_id)
        balance = dec(inv.total) - paid
        if balance > 0:
            rows.append({'invoice_id': inv.id, 'invoice_code': inv.invoice_code, 'client_name': inv.client_name, 'client_tax_id': inv.client_tax_id, 'status': inv.status, 'total': dec(inv.total), 'paid': paid, 'balance': balance, 'payment_status': 'sin_pago' if paid <= 0 else 'parcial'})
    return rows

def create_bank_account(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    item = models.BankAccount(company_id=company_id, **data.model_dump())
    db.add(item); db.commit(); db.refresh(item); return item

def list_bank_accounts(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return list(db.scalars(select(models.BankAccount).where(models.BankAccount.company_id == company_id, models.BankAccount.is_deleted == False).order_by(models.BankAccount.id.desc())).all())

def create_deposit(db: Session, data, company_id: int = DEFAULT_COMPANY_ID):
    amount = dec(data.amount)
    if amount <= 0:
        raise ValueError('El depósito debe ser mayor que cero.')
    item = models.Deposit(company_id=company_id, deposit_code=next_code(db, models.Deposit, 'DEP', company_id), **data.model_dump())
    db.add(item)
    if data.bank_account_id:
        account = db.get(models.BankAccount, data.bank_account_id)
        if account and account.company_id == company_id:
            account.current_balance = dec(account.current_balance) + amount
    db.commit(); db.refresh(item); return item

def list_deposits(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    return list(db.scalars(select(models.Deposit).where(models.Deposit.company_id == company_id, models.Deposit.is_deleted == False).order_by(models.Deposit.id.desc())).all())

def summary(db: Session, company_id: int = DEFAULT_COMPANY_ID):
    sessions = list_cash_sessions(db, company_id)
    active = [s for s in sessions if s.status == 'abierta']
    cash_expected = sum([dec(s.expected_amount) for s in active], Decimal('0'))
    payments_total = dec(db.scalar(select(func.coalesce(func.sum(models.Payment.amount), 0)).where(models.Payment.company_id == company_id, models.Payment.status == 'aplicado', models.Payment.is_deleted == False)))
    today = datetime.now(timezone.utc).date()
    payments = list_payments(db, company_id)
    payments_today = sum([dec(p.amount) for p in payments if p.created_at.date() == today], Decimal('0'))
    pending = sum([r['balance'] for r in receivables(db, company_id)], Decimal('0'))
    bank_balance = dec(db.scalar(select(func.coalesce(func.sum(models.BankAccount.current_balance), 0)).where(models.BankAccount.company_id == company_id, models.BankAccount.is_deleted == False)))
    deposits_total = dec(db.scalar(select(func.coalesce(func.sum(models.Deposit.amount), 0)).where(models.Deposit.company_id == company_id, models.Deposit.is_deleted == False)))
    return {'active_cash_sessions': len(active), 'cash_expected': cash_expected, 'payments_total': payments_total, 'payments_today': payments_today, 'pending_receivables': pending, 'overdue_receivables': Decimal('0'), 'bank_balance': bank_balance, 'deposits_total': deposits_total}
