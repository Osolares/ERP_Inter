from sqlalchemy import String, Text, ForeignKey, Numeric, Integer, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.base import Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin

class Category(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_categories'
    __table_args__ = (UniqueConstraint('company_id', 'name', name='uq_inventory_categories_company_name'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_categories.id'), nullable=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    singular_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    category_kind: Mapped[str] = mapped_column(String(40), nullable=False, default='producto')  # principal, producto, woo, general
    sku_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default='')
    icon: Mapped[str] = mapped_column(String(30), nullable=False, default='')
    color: Mapped[str] = mapped_column(String(30), nullable=False, default='')
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requires_engine_series: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    handles_inventory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Brand(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_brands'
    __table_args__ = (UniqueConstraint('company_id', 'name', name='uq_inventory_brands_company_name'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class VehicleModel(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_vehicle_models'
    __table_args__ = (UniqueConstraint('company_id', 'brand_id', 'name', name='uq_inventory_models_company_brand_name'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey('inventory_brands.id'), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class EngineSeries(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_engine_series'
    __table_args__ = (UniqueConstraint('company_id', 'code', name='uq_inventory_engine_series_company_code'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), nullable=False)
    name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    brand_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    fuel_type: Mapped[str] = mapped_column(String(60), nullable=False, default='')
    displacement_cc: Mapped[str] = mapped_column(String(40), nullable=False, default='')
    cylinders: Mapped[str] = mapped_column(String(40), nullable=False, default='')
    equivalent_series: Mapped[str] = mapped_column(Text, nullable=False, default='')  # chips separados por coma
    sku_prefix: Mapped[str] = mapped_column(String(20), nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Warehouse(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_warehouses'
    __table_args__ = (UniqueConstraint('company_id', 'code', name='uq_inventory_warehouses_company_code'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    location: Mapped[str] = mapped_column(String(180), nullable=False, default='')
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Characteristic(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_characteristics'
    __table_args__ = (UniqueConstraint('company_id', 'name', name='uq_inventory_characteristics_company_name'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class CatalogValue(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_catalog_values'
    __table_args__ = (UniqueConstraint('company_id', 'catalog_type', 'name', name='uq_inventory_catalog_values_company_type_name'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    catalog_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)  # combustible, cc, cilindros, condicion, unidad, tipo, ubicacion, puerto, etc.
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    code: Mapped[str] = mapped_column(String(60), nullable=False, default='')
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Product(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_products'
    __table_args__ = (UniqueConstraint('company_id', 'sku', name='uq_inventory_products_company_sku'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(220), nullable=False)
    short_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    product_type: Mapped[str] = mapped_column(String(40), nullable=False, default='repuesto')  # repuesto, motor, servicio, kit, accesorio
    inventory_mode: Mapped[str] = mapped_column(String(40), nullable=False, default='inventariable')  # inventariable, fuera_inventario, servicio
    condition: Mapped[str] = mapped_column(String(40), nullable=False, default='nuevo')
    main_category_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_categories.id'), nullable=True)
    product_category_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_categories.id'), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_categories.id'), nullable=True)  # compatibilidad v14.1.1
    additional_category_ids: Mapped[str] = mapped_column(Text, nullable=False, default='')  # chips ids o nombres separados por coma
    characteristic_tags: Mapped[str] = mapped_column(Text, nullable=False, default='')
    brand_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_brands.id'), nullable=True)
    engine_series_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_engine_series.id'), nullable=True)
    unit: Mapped[str] = mapped_column(String(30), nullable=False, default='unidad')

    compatible_brand: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    compatible_model: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    year_from: Mapped[str] = mapped_column(String(10), nullable=False, default='')
    year_to: Mapped[str] = mapped_column(String(10), nullable=False, default='')
    fuel_type: Mapped[str] = mapped_column(String(60), nullable=False, default='')
    displacement_cc: Mapped[str] = mapped_column(String(40), nullable=False, default='')
    cylinders: Mapped[str] = mapped_column(String(40), nullable=False, default='')
    oem_primary: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    oem_compatible_codes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    compatible_engine_series_tags: Mapped[str] = mapped_column(Text, nullable=False, default='')

    price_sale: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    offer_discount_percent: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=10)
    price_offer: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    price_wholesale: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    price_min_authorized: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    prices_linked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stock_min: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=1)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default='GTQ')
    tax_rate: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=12)

    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    internal_notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    sale_notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Lot(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_lots'
    __table_args__ = (UniqueConstraint('company_id', 'lot_code', name='uq_inventory_lots_company_code'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('inventory_products.id'), nullable=False, index=True)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=False, index=True)
    lot_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    barcode: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    qr_code: Mapped[str] = mapped_column(String(160), nullable=False, default='')
    engine_number: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    serial_number: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    condition: Mapped[str] = mapped_column(String(40), nullable=False, default='nuevo')
    location: Mapped[str] = mapped_column(String(120), nullable=False, default='')

    quantity_initial: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    quantity_available: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)  # compatibilidad v14.1.1
    physical_initial_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_initial_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    reserved_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    pending_exit_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    blocked_qty: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    unit_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)  # costo con IVA incluido
    cost_includes_tax: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    special_lot_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    is_out_of_accounting_inventory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_sellable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    inventory_status: Mapped[str] = mapped_column(String(40), nullable=False, default='disponible')

    is_disassemblable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disassembly_status: Mapped[str] = mapped_column(String(40), nullable=False, default='no_aplica')
    parent_lot_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_lots.id'), nullable=True)

    purchase_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_purchases.id'), nullable=True, index=True)
    purchase_document_reference: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    purchase_date: Mapped[str] = mapped_column(String(30), nullable=False, default='')
    supplier_name: Mapped[str] = mapped_column(String(180), nullable=False, default='')
    supplier_tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='')

    import_policy_number: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    import_port: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    import_date: Mapped[str] = mapped_column(String(30), nullable=False, default='')

    original_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    distributed_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    pending_cost_to_distribute: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class WarehouseExit(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_warehouse_exits'

    id: Mapped[int] = mapped_column(primary_key=True)
    exit_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    client_name: Mapped[str] = mapped_column(String(180), nullable=False, default='Consumidor final')
    client_tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='pendiente_facturar')
    is_invoiced: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    invoice_reference: Mapped[str] = mapped_column(String(100), nullable=False, default='')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    internal_notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    total_reference: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class WarehouseExitLine(Base, TimestampMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_warehouse_exit_lines'

    id: Mapped[int] = mapped_column(primary_key=True)
    exit_id: Mapped[int] = mapped_column(ForeignKey('inventory_warehouse_exits.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('inventory_products.id'), nullable=False, index=True)
    lot_id: Mapped[int] = mapped_column(ForeignKey('inventory_lots.id'), nullable=False, index=True)
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    unit_price_reference: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total_reference: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    invoice_status: Mapped[str] = mapped_column(String(40), nullable=False, default='pendiente_facturar')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')


class SalesInvoice(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'sales_invoices'

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    source_exit_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouse_exits.id'), nullable=True, index=True)
    client_name: Mapped[str] = mapped_column(String(180), nullable=False, default='Consumidor final')
    client_tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='emitida')
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    internal_notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class SalesInvoiceLine(Base, TimestampMixin, CompanyOwnedMixin):
    __tablename__ = 'sales_invoice_lines'

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey('sales_invoices.id'), nullable=False, index=True)
    source_exit_line_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouse_exit_lines.id'), nullable=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('inventory_products.id'), nullable=False, index=True)
    lot_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_lots.id'), nullable=True, index=True)
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    unit_price: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    tax_rate: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=12)
    total_line: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    affects_physical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    affects_accounting: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    physical_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')



class Customer(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_customers'
    __table_args__ = (UniqueConstraint('company_id', 'tax_id', name='uq_inventory_customers_company_tax_id'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    contact_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    phone: Mapped[str] = mapped_column(String(60), nullable=False, default='')
    email: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    address: Mapped[str] = mapped_column(Text, nullable=False, default='')
    price_type: Mapped[str] = mapped_column(String(40), nullable=False, default='normal')
    discount_percent: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    seller_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Supplier(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_suppliers'
    __table_args__ = (UniqueConstraint('company_id', 'tax_id', name='uq_inventory_suppliers_company_tax_id'),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    contact_name: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    phone: Mapped[str] = mapped_column(String(60), nullable=False, default='')
    email: Mapped[str] = mapped_column(String(140), nullable=False, default='')
    address: Mapped[str] = mapped_column(Text, nullable=False, default='')
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Purchase(Base, TimestampMixin, SoftDeleteMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_purchases'

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_code: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    supplier_name: Mapped[str] = mapped_column(String(180), nullable=False, default='Proveedor general')
    supplier_tax_id: Mapped[str] = mapped_column(String(40), nullable=False, default='CF')
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default='registrada')
    document_reference: Mapped[str] = mapped_column(String(120), nullable=False, default='')
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    tax_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    internal_notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class PurchaseLine(Base, TimestampMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_purchase_lines'

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey('inventory_purchases.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('inventory_products.id'), nullable=False, index=True)
    lot_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_lots.id'), nullable=True, index=True)
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    unit_cost_with_tax: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    line_total_with_tax: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    is_out_of_accounting_inventory: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    physical_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_before: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')

class KardexMovement(Base, TimestampMixin, CompanyOwnedMixin):
    __tablename__ = 'inventory_kardex_movements'

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('inventory_products.id'), nullable=False, index=True)
    lot_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_lots.id'), nullable=True, index=True)
    warehouse_id: Mapped[int | None] = mapped_column(ForeignKey('inventory_warehouses.id'), nullable=True, index=True)
    movement_type: Mapped[str] = mapped_column(String(40), nullable=False)  # entrada, salida, venta, ajuste, desarme, anulacion
    reference_type: Mapped[str] = mapped_column(String(80), nullable=False, default='manual')
    reference_id: Mapped[str] = mapped_column(String(80), nullable=False, default='')
    affects_physical: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    affects_accounting: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    physical_balance_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    accounting_balance_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    balance_after: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)  # compatibilidad v14.1.1
    notes: Mapped[str] = mapped_column(Text, nullable=False, default='')
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
