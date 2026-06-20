"""core inventario base

Revision ID: 20260616_0002
Revises: 20260616_0001
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa

revision = '20260616_0002'
down_revision = '20260616_0001'
branch_labels = None
depends_on = None


def ts_columns():
    return [
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    ]

def soft_delete_columns():
    return [
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    ]


def upgrade():
    op.create_table('inventory_categories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('inventory_categories.id'), nullable=True),
        sa.Column('name', sa.String(length=140), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'name', name='uq_inventory_categories_company_name')
    )
    op.create_index('ix_inventory_categories_company_id', 'inventory_categories', ['company_id'])

    op.create_table('inventory_brands',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=140), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'name', name='uq_inventory_brands_company_name')
    )
    op.create_index('ix_inventory_brands_company_id', 'inventory_brands', ['company_id'])

    op.create_table('inventory_vehicle_models',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('brand_id', sa.Integer(), sa.ForeignKey('inventory_brands.id'), nullable=False),
        sa.Column('name', sa.String(length=140), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'brand_id', 'name', name='uq_inventory_models_company_brand_name')
    )
    op.create_index('ix_inventory_vehicle_models_company_id', 'inventory_vehicle_models', ['company_id'])
    op.create_index('ix_inventory_vehicle_models_brand_id', 'inventory_vehicle_models', ['brand_id'])

    op.create_table('inventory_engine_series',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('fuel_type', sa.String(length=60), nullable=False, server_default=''),
        sa.Column('displacement_cc', sa.String(length=40), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'code', name='uq_inventory_engine_series_company_code')
    )
    op.create_index('ix_inventory_engine_series_company_id', 'inventory_engine_series', ['company_id'])

    op.create_table('inventory_warehouses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=40), nullable=False),
        sa.Column('name', sa.String(length=140), nullable=False),
        sa.Column('location', sa.String(length=180), nullable=False, server_default=''),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'code', name='uq_inventory_warehouses_company_code')
    )
    op.create_index('ix_inventory_warehouses_company_id', 'inventory_warehouses', ['company_id'])

    op.create_table('inventory_products',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('sku', sa.String(length=80), nullable=False),
        sa.Column('name', sa.String(length=220), nullable=False),
        sa.Column('product_type', sa.String(length=40), nullable=False, server_default='repuesto'),
        sa.Column('condition', sa.String(length=40), nullable=False, server_default='nuevo'),
        sa.Column('category_id', sa.Integer(), sa.ForeignKey('inventory_categories.id'), nullable=True),
        sa.Column('brand_id', sa.Integer(), sa.ForeignKey('inventory_brands.id'), nullable=True),
        sa.Column('engine_series_id', sa.Integer(), sa.ForeignKey('inventory_engine_series.id'), nullable=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('unit', sa.String(length=30), nullable=False, server_default='unidad'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'sku', name='uq_inventory_products_company_sku')
    )
    op.create_index('ix_inventory_products_company_id', 'inventory_products', ['company_id'])
    op.create_index('ix_inventory_products_sku', 'inventory_products', ['sku'])

    op.create_table('inventory_lots',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('inventory_products.id'), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=False),
        sa.Column('lot_code', sa.String(length=80), nullable=False),
        sa.Column('engine_number', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('barcode', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('qr_code', sa.String(length=160), nullable=False, server_default=''),
        sa.Column('quantity_initial', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('quantity_available', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('unit_cost', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('sale_price', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('location', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('is_out_of_accounting_inventory', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        *ts_columns(), *soft_delete_columns(),
        sa.UniqueConstraint('company_id', 'lot_code', name='uq_inventory_lots_company_code')
    )
    op.create_index('ix_inventory_lots_company_id', 'inventory_lots', ['company_id'])
    op.create_index('ix_inventory_lots_product_id', 'inventory_lots', ['product_id'])
    op.create_index('ix_inventory_lots_warehouse_id', 'inventory_lots', ['warehouse_id'])
    op.create_index('ix_inventory_lots_lot_code', 'inventory_lots', ['lot_code'])

    op.create_table('inventory_kardex_movements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('inventory_products.id'), nullable=False),
        sa.Column('lot_id', sa.Integer(), sa.ForeignKey('inventory_lots.id'), nullable=True),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=True),
        sa.Column('movement_type', sa.String(length=40), nullable=False),
        sa.Column('reference_type', sa.String(length=80), nullable=False, server_default='manual'),
        sa.Column('reference_id', sa.String(length=80), nullable=False, server_default=''),
        sa.Column('quantity', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('unit_cost', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('balance_after', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('user_id', sa.Integer(), nullable=True),
        *ts_columns()
    )
    op.create_index('ix_inventory_kardex_movements_company_id', 'inventory_kardex_movements', ['company_id'])
    op.create_index('ix_inventory_kardex_movements_product_id', 'inventory_kardex_movements', ['product_id'])
    op.create_index('ix_inventory_kardex_movements_lot_id', 'inventory_kardex_movements', ['lot_id'])
    op.create_index('ix_inventory_kardex_movements_warehouse_id', 'inventory_kardex_movements', ['warehouse_id'])


def downgrade():
    op.drop_table('inventory_kardex_movements')
    op.drop_table('inventory_lots')
    op.drop_table('inventory_products')
    op.drop_table('inventory_warehouses')
    op.drop_table('inventory_engine_series')
    op.drop_table('inventory_vehicle_models')
    op.drop_table('inventory_brands')
    op.drop_table('inventory_categories')
