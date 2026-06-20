"""Proveedores para Compras Pro

Revision ID: 20260618_0007
Revises: 20260618_0006
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0007'
down_revision = '20260618_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'inventory_suppliers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=180), nullable=False),
        sa.Column('tax_id', sa.String(length=40), nullable=False, server_default='CF'),
        sa.Column('contact_name', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('phone', sa.String(length=60), nullable=False, server_default=''),
        sa.Column('email', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('address', sa.Text(), nullable=False, server_default=''),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('company_id', 'tax_id', name='uq_inventory_suppliers_company_tax_id'),
    )
    op.create_index('ix_inventory_suppliers_company_id', 'inventory_suppliers', ['company_id'])
    op.create_index('ix_inventory_suppliers_name', 'inventory_suppliers', ['name'])


def downgrade() -> None:
    op.drop_index('ix_inventory_suppliers_name', table_name='inventory_suppliers')
    op.drop_index('ix_inventory_suppliers_company_id', table_name='inventory_suppliers')
    op.drop_table('inventory_suppliers')
