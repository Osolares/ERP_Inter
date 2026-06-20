"""clientes ventas base

Revision ID: 20260618_0008
Revises: 20260618_0007
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0008'
down_revision = '20260618_0007'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'inventory_customers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('name', sa.String(length=180), nullable=False),
        sa.Column('tax_id', sa.String(length=40), nullable=False, server_default='CF'),
        sa.Column('contact_name', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('phone', sa.String(length=60), nullable=False, server_default=''),
        sa.Column('email', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('address', sa.Text(), nullable=False, server_default=''),
        sa.Column('price_type', sa.String(length=40), nullable=False, server_default='normal'),
        sa.Column('discount_percent', sa.Numeric(6, 2), nullable=False, server_default='0'),
        sa.Column('seller_name', sa.String(length=140), nullable=False, server_default=''),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('company_id', 'tax_id', name='uq_inventory_customers_company_tax_id'),
    )

def downgrade():
    op.drop_table('inventory_customers')
