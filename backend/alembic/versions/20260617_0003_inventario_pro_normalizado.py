"""Inventario Pro normalizado: campos producto/lote, físico/contable y desarmes base."""
from alembic import op
import sqlalchemy as sa

revision = '20260617_0003'
down_revision = '20260616_0002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'inventory_characteristics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('company_id', sa.Integer(), nullable=False, index=True),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('company_id', 'name', name='uq_inventory_characteristics_company_name')
    )

    # Categorías: se preparan para principal/producto/Woo y reglas de SKU.
    op.add_column('inventory_categories', sa.Column('category_kind', sa.String(length=40), nullable=False, server_default='producto'))
    op.add_column('inventory_categories', sa.Column('sku_prefix', sa.String(length=20), nullable=False, server_default=''))
    op.add_column('inventory_categories', sa.Column('requires_engine_series', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('inventory_categories', sa.Column('handles_inventory', sa.Boolean(), nullable=False, server_default=sa.text('true')))

    # Series de motor: autollenan marca/combustible/cc/cilindros y sugieren SKU.
    op.add_column('inventory_engine_series', sa.Column('brand_name', sa.String(length=140), nullable=False, server_default=''))
    op.add_column('inventory_engine_series', sa.Column('cylinders', sa.String(length=40), nullable=False, server_default=''))
    op.add_column('inventory_engine_series', sa.Column('equivalent_series', sa.Text(), nullable=False, server_default=''))
    op.add_column('inventory_engine_series', sa.Column('sku_prefix', sa.String(length=20), nullable=False, server_default=''))

    # Producto maestro: concepto comercial sin stock/costo real.
    for table, cols in {
        'inventory_products': [
            sa.Column('short_name', sa.String(length=140), nullable=False, server_default=''),
            sa.Column('inventory_mode', sa.String(length=40), nullable=False, server_default='inventariable'),
            sa.Column('main_category_id', sa.Integer(), nullable=True),
            sa.Column('product_category_id', sa.Integer(), nullable=True),
            sa.Column('additional_category_ids', sa.Text(), nullable=False, server_default=''),
            sa.Column('characteristic_tags', sa.Text(), nullable=False, server_default=''),
            sa.Column('compatible_brand', sa.String(length=140), nullable=False, server_default=''),
            sa.Column('compatible_model', sa.String(length=140), nullable=False, server_default=''),
            sa.Column('year_from', sa.String(length=10), nullable=False, server_default=''),
            sa.Column('year_to', sa.String(length=10), nullable=False, server_default=''),
            sa.Column('fuel_type', sa.String(length=60), nullable=False, server_default=''),
            sa.Column('displacement_cc', sa.String(length=40), nullable=False, server_default=''),
            sa.Column('cylinders', sa.String(length=40), nullable=False, server_default=''),
            sa.Column('oem_primary', sa.String(length=120), nullable=False, server_default=''),
            sa.Column('oem_compatible_codes', sa.Text(), nullable=False, server_default=''),
            sa.Column('compatible_engine_series_tags', sa.Text(), nullable=False, server_default=''),
            sa.Column('price_sale', sa.Numeric(14, 2), nullable=False, server_default='0'),
            sa.Column('offer_discount_percent', sa.Numeric(6, 2), nullable=False, server_default='10'),
            sa.Column('price_offer', sa.Numeric(14, 2), nullable=False, server_default='0'),
            sa.Column('price_wholesale', sa.Numeric(14, 2), nullable=False, server_default='0'),
            sa.Column('price_min_authorized', sa.Numeric(14, 2), nullable=False, server_default='0'),
            sa.Column('prices_linked', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('stock_min', sa.Numeric(14, 2), nullable=False, server_default='1'),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='GTQ'),
            sa.Column('tax_rate', sa.Numeric(6, 2), nullable=False, server_default='12'),
            sa.Column('internal_notes', sa.Text(), nullable=False, server_default=''),
            sa.Column('sale_notes', sa.Text(), nullable=False, server_default=''),
        ]
    }.items():
        for col in cols:
            op.add_column(table, col)
    op.create_foreign_key('fk_inventory_products_main_category', 'inventory_products', 'inventory_categories', ['main_category_id'], ['id'])
    op.create_foreign_key('fk_inventory_products_product_category', 'inventory_products', 'inventory_categories', ['product_category_id'], ['id'])

    # Lotes: unidad real de inventario físico/contable, costos con IVA incluido y base de desarmes.
    lot_cols = [
        sa.Column('serial_number', sa.String(length=120), nullable=False, server_default=''),
        sa.Column('condition', sa.String(length=40), nullable=False, server_default='nuevo'),
        sa.Column('physical_initial_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('physical_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_initial_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('accounting_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('reserved_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('pending_exit_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('blocked_qty', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('cost_includes_tax', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('special_lot_price', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('is_sellable', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_blocked', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('inventory_status', sa.String(length=40), nullable=False, server_default='disponible'),
        sa.Column('is_disassemblable', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('disassembly_status', sa.String(length=40), nullable=False, server_default='no_aplica'),
        sa.Column('parent_lot_id', sa.Integer(), nullable=True),
        sa.Column('original_cost', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('distributed_cost', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('pending_cost_to_distribute', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=False, server_default=''),
    ]
    for col in lot_cols:
        op.add_column('inventory_lots', col)
    op.create_foreign_key('fk_inventory_lots_parent_lot', 'inventory_lots', 'inventory_lots', ['parent_lot_id'], ['id'])
    op.execute("""
        UPDATE inventory_lots
        SET physical_initial_qty = quantity_initial,
            physical_qty = quantity_available,
            accounting_initial_qty = CASE WHEN is_out_of_accounting_inventory THEN 0 ELSE quantity_initial END,
            accounting_qty = CASE WHEN is_out_of_accounting_inventory THEN 0 ELSE quantity_available END,
            original_cost = quantity_initial * unit_cost,
            pending_cost_to_distribute = quantity_initial * unit_cost;
    """)

    # Kardex: cada movimiento declara si afecta físico y/o contable.
    op.add_column('inventory_kardex_movements', sa.Column('affects_physical', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('inventory_kardex_movements', sa.Column('affects_accounting', sa.Boolean(), nullable=False, server_default=sa.text('true')))
    op.add_column('inventory_kardex_movements', sa.Column('physical_balance_after', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('inventory_kardex_movements', sa.Column('accounting_balance_after', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.execute("""
        UPDATE inventory_kardex_movements
        SET physical_balance_after = balance_after,
            accounting_balance_after = balance_after;
    """)


def downgrade():
    op.drop_column('inventory_kardex_movements', 'accounting_balance_after')
    op.drop_column('inventory_kardex_movements', 'physical_balance_after')
    op.drop_column('inventory_kardex_movements', 'affects_accounting')
    op.drop_column('inventory_kardex_movements', 'affects_physical')
    op.drop_constraint('fk_inventory_lots_parent_lot', 'inventory_lots', type_='foreignkey')
    for col in ['notes','pending_cost_to_distribute','distributed_cost','original_cost','parent_lot_id','disassembly_status','is_disassemblable','inventory_status','is_blocked','is_sellable','special_lot_price','cost_includes_tax','blocked_qty','pending_exit_qty','reserved_qty','accounting_qty','accounting_initial_qty','physical_qty','physical_initial_qty','condition','serial_number']:
        op.drop_column('inventory_lots', col)
    op.drop_constraint('fk_inventory_products_product_category', 'inventory_products', type_='foreignkey')
    op.drop_constraint('fk_inventory_products_main_category', 'inventory_products', type_='foreignkey')
    for col in ['sale_notes','internal_notes','tax_rate','currency','stock_min','prices_linked','price_min_authorized','price_wholesale','price_offer','offer_discount_percent','price_sale','compatible_engine_series_tags','oem_compatible_codes','oem_primary','cylinders','displacement_cc','fuel_type','year_to','year_from','compatible_model','compatible_brand','characteristic_tags','additional_category_ids','product_category_id','main_category_id','inventory_mode','short_name']:
        op.drop_column('inventory_products', col)
    for col in ['sku_prefix','equivalent_series','cylinders','brand_name']:
        op.drop_column('inventory_engine_series', col)
    for col in ['handles_inventory','requires_engine_series','sku_prefix','category_kind']:
        op.drop_column('inventory_categories', col)
    op.drop_table('inventory_characteristics')
