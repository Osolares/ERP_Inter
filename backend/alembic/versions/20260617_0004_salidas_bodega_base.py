"""salidas de bodega base

Revision ID: 20260617_0004
Revises: 20260617_0003
Create Date: 2026-06-17
"""
from alembic import op
import sqlalchemy as sa

revision = '20260617_0004'
down_revision = '20260617_0003'
branch_labels = None
depends_on = None

def ts_columns():
    return [sa.Column('created_at', sa.DateTime(timezone=True), nullable=False), sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)]

def soft_delete_columns():
    return [sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')), sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)]

def upgrade():
    op.create_table('inventory_warehouse_exits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('exit_code', sa.String(length=80), nullable=False),
        sa.Column('client_name', sa.String(length=180), nullable=False, server_default='Consumidor final'),
        sa.Column('client_tax_id', sa.String(length=40), nullable=False, server_default='CF'),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=True),
        sa.Column('status', sa.String(length=40), nullable=False, server_default='pendiente_facturar'),
        sa.Column('is_invoiced', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('invoice_reference', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('internal_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('total_reference', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
    )
    op.create_index('ix_inventory_warehouse_exits_company_id', 'inventory_warehouse_exits', ['company_id'])
    op.create_index('ix_inventory_warehouse_exits_exit_code', 'inventory_warehouse_exits', ['exit_code'])

    op.create_table('inventory_warehouse_exit_lines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('exit_id', sa.Integer(), sa.ForeignKey('inventory_warehouse_exits.id'), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('inventory_products.id'), nullable=False),
        sa.Column('lot_id', sa.Integer(), sa.ForeignKey('inventory_lots.id'), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('quantity', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('unit_price_reference', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_reference', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('physical_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('physical_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('invoice_status', sa.String(length=40), nullable=False, server_default='pendiente_facturar'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        *ts_columns(),
    )
    op.create_index('ix_inventory_warehouse_exit_lines_exit_id', 'inventory_warehouse_exit_lines', ['exit_id'])
    op.create_index('ix_inventory_warehouse_exit_lines_lot_id', 'inventory_warehouse_exit_lines', ['lot_id'])


def downgrade():
    op.drop_table('inventory_warehouse_exit_lines')
    op.drop_table('inventory_warehouse_exits')
