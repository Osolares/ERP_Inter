"""Compras Pro Base

Revision ID: 20260618_0006
Revises: 20260617_0005
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0006'
down_revision = '20260617_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'inventory_purchases',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('purchase_code', sa.String(length=80), nullable=False),
        sa.Column('supplier_name', sa.String(length=180), nullable=False, server_default='Proveedor general'),
        sa.Column('supplier_tax_id', sa.String(length=40), nullable=False, server_default='CF'),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=40), nullable=False, server_default='registrada'),
        sa.Column('document_reference', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('subtotal', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('tax_total', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('internal_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['warehouse_id'], ['inventory_warehouses.id']),
    )
    op.create_index('ix_inventory_purchases_purchase_code', 'inventory_purchases', ['purchase_code'])
    op.create_index('ix_inventory_purchases_warehouse_id', 'inventory_purchases', ['warehouse_id'])

    op.create_table(
        'inventory_purchase_lines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('purchase_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('lot_id', sa.Integer(), nullable=True),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('quantity', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('unit_cost_with_tax', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('line_total_with_tax', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('is_out_of_accounting_inventory', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('physical_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('physical_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_before', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['purchase_id'], ['inventory_purchases.id']),
        sa.ForeignKeyConstraint(['product_id'], ['inventory_products.id']),
        sa.ForeignKeyConstraint(['lot_id'], ['inventory_lots.id']),
        sa.ForeignKeyConstraint(['warehouse_id'], ['inventory_warehouses.id']),
    )
    op.create_index('ix_inventory_purchase_lines_purchase_id', 'inventory_purchase_lines', ['purchase_id'])
    op.create_index('ix_inventory_purchase_lines_product_id', 'inventory_purchase_lines', ['product_id'])
    op.create_index('ix_inventory_purchase_lines_lot_id', 'inventory_purchase_lines', ['lot_id'])
    op.create_index('ix_inventory_purchase_lines_warehouse_id', 'inventory_purchase_lines', ['warehouse_id'])


def downgrade() -> None:
    op.drop_index('ix_inventory_purchase_lines_warehouse_id', table_name='inventory_purchase_lines')
    op.drop_index('ix_inventory_purchase_lines_lot_id', table_name='inventory_purchase_lines')
    op.drop_index('ix_inventory_purchase_lines_product_id', table_name='inventory_purchase_lines')
    op.drop_index('ix_inventory_purchase_lines_purchase_id', table_name='inventory_purchase_lines')
    op.drop_table('inventory_purchase_lines')
    op.drop_index('ix_inventory_purchases_warehouse_id', table_name='inventory_purchases')
    op.drop_index('ix_inventory_purchases_purchase_code', table_name='inventory_purchases')
    op.drop_table('inventory_purchases')
