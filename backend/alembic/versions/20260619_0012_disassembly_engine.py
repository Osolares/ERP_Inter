"""motor de desarmes automotrices

Revision ID: 20260619_0012
Revises: 20260618_0011
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = '20260619_0012'
down_revision = '20260618_0011'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'automotive_disassemblies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1', index=True),
        sa.Column('disassembly_code', sa.String(80), nullable=False, index=True),
        sa.Column('source_lot_id', sa.Integer(), sa.ForeignKey('inventory_lots.id'), nullable=False, index=True),
        sa.Column('mode', sa.String(40), nullable=False, server_default='parcial'),
        sa.Column('status', sa.String(40), nullable=False, server_default='registrado'),
        sa.Column('source_qty', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('source_unit_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('total_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('allocated_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('residual_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('company_id', 'disassembly_code', name='uq_automotive_disassemblies_company_code')
    )
    op.create_table(
        'automotive_disassembly_lines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1', index=True),
        sa.Column('disassembly_id', sa.Integer(), sa.ForeignKey('automotive_disassemblies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('inventory_products.id'), nullable=False, index=True),
        sa.Column('warehouse_id', sa.Integer(), sa.ForeignKey('inventory_warehouses.id'), nullable=True, index=True),
        sa.Column('lot_code', sa.String(80), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('quantity', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('unit_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('total_cost', sa.Numeric(14,2), nullable=False, server_default='0'),
        sa.Column('created_lot_id', sa.Integer(), sa.ForeignKey('inventory_lots.id'), nullable=True, index=True),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
    )
    op.execute("""
        INSERT INTO permissions (code, description, created_at, updated_at)
        VALUES
        ('automotive.disassembly.view','Desarmes: ver',NOW(),NOW()),
        ('automotive.disassembly.create','Desarmes: crear',NOW(),NOW()),
        ('automotive.disassembly.reverse','Desarmes: reversar',NOW(),NOW())
        ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description, updated_at=NOW();
    """)


def downgrade():
    op.drop_table('automotive_disassembly_lines')
    op.drop_table('automotive_disassemblies')
