from sqlalchemy import String, Text, ForeignKey, Numeric, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin

class CashSession(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'financial_cash_sessions'

    id: Mapped[int] = mapped_column(primary_key=True)
    session_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    cashier_name: Mapped[str] = mapped_column(String(140), nullable=False, default='Administrador')
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='abierta')
    opening_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    expected_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    counted_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    difference_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    closed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

class Payment(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'financial_payments'

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey('sales_invoices.id'), nullable=True, index=True)
    cash_session_id: Mapped[int | None] = mapped_column(ForeignKey('financial_cash_sessions.id'), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(180), nullable=False, default='Consumidor final')
    customer_tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    method: Mapped[str] = mapped_column(String(40), nullable=False, default='efectivo')
    payment_type: Mapped[str] = mapped_column(String(40), nullable=False, default='abono')  # abono, anticipo, contado
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='aplicado')
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    reference: Mapped[str] = mapped_column(String(160), nullable=False, default='')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')

class BankAccount(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'financial_bank_accounts'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    account_number: Mapped[str] = mapped_column(String(80), nullable=False, default='')
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default='GTQ')
    current_balance: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')

class Deposit(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'financial_deposits'

    id: Mapped[int] = mapped_column(primary_key=True)
    deposit_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    bank_account_id: Mapped[int | None] = mapped_column(ForeignKey('financial_bank_accounts.id'), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    method: Mapped[str] = mapped_column(String(40), nullable=False, default='deposito')
    reference: Mapped[str] = mapped_column(String(160), nullable=False, default='')
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='registrado')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
