"""facturacion posterior de salida

Revision ID: 20260617_0005
Revises: 20260617_0004
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa

revision = '20260617_0005'
down_revision = '20260617_0004'
branch_labels = None
depends_on = None

def ts_columns():
    return [sa.Column('created_at', sa.DateTime(timezone=True), nullable=False), sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)]

def soft_delete_columns():
    return [sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')), sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)]

def upgrade():
    op.create_table('sales_invoices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('invoice_code', sa.String(length=80), nullable=False),
        sa.Column('source_exit_id', sa.Integer(), sa.ForeignKey('inventory_warehouse_exits.id'), nullable=True),
        sa.Column('client_name', sa.String(length=180), nullable=False, server_default='Consumidor final'),
        sa.Column('client_tax_id', sa.String(length=40), nullable=False, server_default='CF'),
        sa.Column('status', sa.String(length=40), nullable=False, server_default='emitida'),
        sa.Column('subtotal', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('tax_total', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('internal_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
    )
    op.create_index('ix_sales_invoices_company_id', 'sales_invoices', ['company_id'])
    op.create_index('ix_sales_invoices_invoice_code', 'sales_invoices', ['invoice_code'])
    op.create_index('ix_sales_invoices_source_exit_id', 'sales_invoices', ['source_exit_id'])

    op.create_table('sales_invoice_lines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('sales_invoices.id'), nullable=False),
        sa.Column('source_exit_line_id', sa.Integer(), sa.ForeignKey('inventory_warehouse_exit_lines.id'), nullable=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('inventory_products.id'), nullable=False),
        sa.Column('lot_id', sa.Integer(), sa.ForeignKey('inventory_lots.id'), nullable=True),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('quantity', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('unit_price', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Numeric(6, 2), nullable=False, server_default='12'),
        sa.Column('total_line', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('affects_physical', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('affects_accounting', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('physical_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('physical_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        *ts_columns(),
    )
    op.create_index('ix_sales_invoice_lines_invoice_id', 'sales_invoice_lines', ['invoice_id'])
    op.create_index('ix_sales_invoice_lines_source_exit_line_id', 'sales_invoice_lines', ['source_exit_line_id'])
    op.create_index('ix_sales_invoice_lines_lot_id', 'sales_invoice_lines', ['lot_id'])


def downgrade():
    op.drop_table('sales_invoice_lines')
    op.drop_table('sales_invoices')
