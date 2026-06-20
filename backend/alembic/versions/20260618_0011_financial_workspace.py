"""workspace financiero profesional

Revision ID: 20260618_0011
Revises: 20260618_0010
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0011'
down_revision = '20260618_0010'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'financial_cash_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('session_code', sa.String(80), nullable=False, index=True),
        sa.Column('cashier_name', sa.String(140), nullable=False, server_default='Administrador'),
        sa.Column('status', sa.String(40), nullable=False, server_default='abierta'),
        sa.Column('opening_amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('expected_amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('counted_amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('difference_amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        'financial_payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('payment_code', sa.String(80), nullable=False, index=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('sales_invoices.id'), nullable=True, index=True),
        sa.Column('cash_session_id', sa.Integer(), sa.ForeignKey('financial_cash_sessions.id'), nullable=True, index=True),
        sa.Column('customer_name', sa.String(180), nullable=False, server_default='Consumidor final'),
        sa.Column('customer_tax_id', sa.String(40), nullable=False, server_default='CF'),
        sa.Column('method', sa.String(40), nullable=False, server_default='efectivo'),
        sa.Column('payment_type', sa.String(40), nullable=False, server_default='abono'),
        sa.Column('status', sa.String(40), nullable=False, server_default='aplicado'),
        sa.Column('amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('reference', sa.String(160), nullable=False, server_default=''),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        'financial_bank_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('name', sa.String(140), nullable=False),
        sa.Column('bank_name', sa.String(140), nullable=False, server_default=''),
        sa.Column('account_number', sa.String(80), nullable=False, server_default=''),
        sa.Column('currency', sa.String(10), nullable=False, server_default='GTQ'),
        sa.Column('current_balance', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        'financial_deposits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('deposit_code', sa.String(80), nullable=False, index=True),
        sa.Column('bank_account_id', sa.Integer(), sa.ForeignKey('financial_bank_accounts.id'), nullable=True, index=True),
        sa.Column('amount', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('method', sa.String(40), nullable=False, server_default='deposito'),
        sa.Column('reference', sa.String(160), nullable=False, server_default=''),
        sa.Column('status', sa.String(40), nullable=False, server_default='registrado'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("""
        INSERT INTO permissions (code, description, created_at, updated_at)
        VALUES
        ('financial.view','Financiero: ver',NOW(),NOW()),
        ('financial.cash.open','Financiero: abrir caja',NOW(),NOW()),
        ('financial.cash.close','Financiero: cerrar caja',NOW(),NOW()),
        ('financial.payments.create','Financiero: registrar cobros',NOW(),NOW()),
        ('financial.banks.manage','Financiero: bancos y depósitos',NOW(),NOW())
        ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description, updated_at=NOW();
    """)

def downgrade():
    op.drop_table('financial_deposits')
    op.drop_table('financial_bank_accounts')
    op.drop_table('financial_payments')
    op.drop_table('financial_cash_sessions')
