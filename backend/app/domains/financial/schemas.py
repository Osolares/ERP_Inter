from decimal import Decimal
from pydantic import BaseModel
from datetime import datetime

class CashSessionCreate(BaseModel):
    cashier_name: str = 'Administrador'
    opening_amount: Decimal = Decimal('0')
    notes: str = ''

class CashSessionClose(BaseModel):
    counted_amount: Decimal = Decimal('0')
    notes: str = ''

class CashSessionRead(BaseModel):
    id: int
    company_id: int
    session_code: str
    cashier_name: str
    status: str
    opening_amount: Decimal
    expected_amount: Decimal
    counted_amount: Decimal
    difference_amount: Decimal
    notes: str
    created_at: datetime
    closed_at: datetime | None = None
    model_config = {'from_attributes': True}

class PaymentCreate(BaseModel):
    invoice_id: int | None = None
    cash_session_id: int | None = None
    customer_name: str = 'Consumidor final'
    customer_tax_id: str = 'CF'
    method: str = 'efectivo'
    payment_type: str = 'abono'
    amount: Decimal = Decimal('0')
    reference: str = ''
    notes: str = ''

class PaymentRead(BaseModel):
    id: int
    company_id: int
    payment_code: str
    invoice_id: int | None
    cash_session_id: int | None
    customer_name: str
    customer_tax_id: str
    method: str
    payment_type: str
    status: str
    amount: Decimal
    reference: str
    notes: str
    created_at: datetime
    model_config = {'from_attributes': True}

class BankAccountCreate(BaseModel):
    name: str
    bank_name: str = ''
    account_number: str = ''
    currency: str = 'GTQ'
    current_balance: Decimal = Decimal('0')
    notes: str = ''

class BankAccountRead(BankAccountCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class DepositCreate(BaseModel):
    bank_account_id: int | None = None
    amount: Decimal = Decimal('0')
    method: str = 'deposito'
    reference: str = ''
    notes: str = ''

class DepositRead(BaseModel):
    id: int
    company_id: int
    deposit_code: str
    bank_account_id: int | None
    amount: Decimal
    method: str
    reference: str
    status: str
    notes: str
    created_at: datetime
    model_config = {'from_attributes': True}

class ReceivableRead(BaseModel):
    invoice_id: int
    invoice_code: str
    client_name: str
    client_tax_id: str
    status: str
    total: Decimal
    paid: Decimal
    balance: Decimal
    payment_status: str

class FinancialSummary(BaseModel):
    active_cash_sessions: int
    cash_expected: Decimal
    payments_total: Decimal
    payments_today: Decimal
    pending_receivables: Decimal
    overdue_receivables: Decimal
    bank_balance: Decimal
    deposits_total: Decimal
