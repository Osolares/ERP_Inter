"""multimedia engine

Revision ID: 20260619_0013
Revises: 20260619_0012
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = '20260619_0013'
down_revision = '20260619_0012'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('media_assets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('target_type', sa.String(length=40), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('asset_type', sa.String(length=30), nullable=False, server_default='image'),
        sa.Column('title', sa.String(length=180), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('alt_text', sa.String(length=240), nullable=False, server_default=''),
        sa.Column('source_url', sa.Text(), nullable=False, server_default=''),
        sa.Column('storage_key', sa.String(length=260), nullable=False, server_default=''),
        sa.Column('mime_type', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tags', sa.Text(), nullable=False, server_default=''),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('uploaded_by', sa.String(length=120), nullable=False, server_default='Sistema'),
        sa.Column('origin', sa.String(length=40), nullable=False, server_default='erp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_media_assets_company_id', 'media_assets', ['company_id'])
    op.create_index('ix_media_assets_target_type', 'media_assets', ['target_type'])
    op.create_index('ix_media_assets_target_id', 'media_assets', ['target_id'])
    op.create_table('media_label_templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=60), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('template_type', sa.String(length=40), nullable=False, server_default='lot'),
        sa.Column('paper_size', sa.String(length=40), nullable=False, server_default='ticket_80mm'),
        sa.Column('width_mm', sa.Integer(), nullable=False, server_default='80'),
        sa.Column('height_mm', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('variables', sa.Text(), nullable=False, server_default='sku,nombre,lote,qr,barcode,precio,ubicacion'),
        sa.Column('body_template', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_media_label_templates_company_id', 'media_label_templates', ['company_id'])
    op.create_index('ix_media_label_templates_code', 'media_label_templates', ['code'])

def downgrade():
    op.drop_index('ix_media_label_templates_code', table_name='media_label_templates')
    op.drop_index('ix_media_label_templates_company_id', table_name='media_label_templates')
    op.drop_table('media_label_templates')
    op.drop_index('ix_media_assets_target_id', table_name='media_assets')
    op.drop_index('ix_media_assets_target_type', table_name='media_assets')
    op.drop_index('ix_media_assets_company_id', table_name='media_assets')
    op.drop_table('media_assets')
