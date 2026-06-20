from alembic import op
import sqlalchemy as sa

revision = '20260619_0015'
down_revision = '20260619_0014'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS singular_name VARCHAR(140) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(30) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS color VARCHAR(30) NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0")
    op.execute("UPDATE inventory_categories SET singular_name = CASE WHEN singular_name='' AND lower(name) LIKE '%es' AND length(name)>4 THEN substring(name from 1 for length(name)-2) WHEN singular_name='' AND lower(name) LIKE '%s' AND length(name)>3 THEN substring(name from 1 for length(name)-1) ELSE singular_name END")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_categories_company_prefix_active ON inventory_categories(company_id, sku_prefix) WHERE is_deleted=false AND sku_prefix <> ''")
    op.create_table('inventory_catalog_values',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('catalog_type', sa.String(80), nullable=False),
        sa.Column('name', sa.String(140), nullable=False),
        sa.Column('code', sa.String(60), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('company_id','catalog_type','name', name='uq_inventory_catalog_values_company_type_name')
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_catalog_values_type ON inventory_catalog_values(catalog_type)")

def downgrade():
    op.drop_table('inventory_catalog_values')
