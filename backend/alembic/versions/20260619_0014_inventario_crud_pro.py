"""Inventario CRUD Pro: lotes con compra, importación y número motor único.

Revision ID: 20260619_0014
Revises: 20260619_0013
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = '20260619_0014'
down_revision = '20260619_0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('inventory_lots', sa.Column('purchase_id', sa.Integer(), nullable=True))
    op.add_column('inventory_lots', sa.Column('purchase_document_reference', sa.String(length=120), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('purchase_date', sa.String(length=30), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('supplier_name', sa.String(length=180), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('supplier_tax_id', sa.String(length=40), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('import_policy_number', sa.String(length=120), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('import_port', sa.String(length=120), nullable=False, server_default=''))
    op.add_column('inventory_lots', sa.Column('import_date', sa.String(length=30), nullable=False, server_default=''))
    op.create_foreign_key('fk_inventory_lots_purchase_id', 'inventory_lots', 'inventory_purchases', ['purchase_id'], ['id'])
    op.create_index('ix_inventory_lots_purchase_id', 'inventory_lots', ['purchase_id'])
    op.create_index(
        'uq_inventory_lots_company_engine_number_non_empty',
        'inventory_lots',
        ['company_id', 'engine_number'],
        unique=True,
        postgresql_where=sa.text("engine_number <> '' AND is_deleted = false")
    )


def downgrade() -> None:
    op.drop_index('uq_inventory_lots_company_engine_number_non_empty', table_name='inventory_lots')
    op.drop_index('ix_inventory_lots_purchase_id', table_name='inventory_lots')
    op.drop_constraint('fk_inventory_lots_purchase_id', 'inventory_lots', type_='foreignkey')
    for column in ['import_date', 'import_port', 'import_policy_number', 'supplier_tax_id', 'supplier_name', 'purchase_date', 'purchase_document_reference', 'purchase_id']:
        op.drop_column('inventory_lots', column)
