from decimal import Decimal
from pydantic import BaseModel, Field, computed_field, field_validator

class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)
    singular_name: str = ''
    description: str = ''
    parent_id: int | None = None
    category_kind: str = 'producto'
    sku_prefix: str = ''
    icon: str = ''
    color: str = ''
    sort_order: int = 0
    requires_engine_series: bool = False
    handles_inventory: bool = True

class CategoryRead(CategoryCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class BrandCreate(BaseModel):
    name: str = Field(min_length=2, max_length=140)

class BrandRead(BrandCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}


class VehicleModelCreate(BaseModel):
    @field_validator('brand_id', mode='before')
    @classmethod
    def empty_brand_to_none(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value
    brand_id: int
    name: str = Field(min_length=2, max_length=140)

class VehicleModelRead(VehicleModelCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class CharacteristicCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ''

class CharacteristicRead(CharacteristicCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class CatalogValueCreate(BaseModel):
    catalog_type: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=1, max_length=140)
    code: str = ''
    description: str = ''
    sort_order: int = 0
    is_active: bool = True

class CatalogValueRead(CatalogValueCreate):
    id: int
    company_id: int
    model_config = {'from_attributes': True}

class EngineSeriesCreate(BaseModel):
    code: str = Field(min_length=2, max_length=80)
    name: str = ''
    brand_name: str = ''
    fuel_type: str = ''
    displacement_cc: str = ''
    cylinders: str = ''
    equivalent_series: str = ''
    sku_prefix: str = ''

class EngineSeriesRead(EngineSeriesCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class WarehouseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=140)
    location: str = ''
    is_default: bool = False

class WarehouseRead(WarehouseCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}

class ProductCreate(BaseModel):
    @field_validator('main_category_id', 'product_category_id', 'category_id', 'brand_id', 'engine_series_id', mode='before')
    @classmethod
    def empty_string_to_none(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value

    sku: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=3, max_length=220)
    short_name: str = ''
    product_type: str = 'repuesto'
    inventory_mode: str = 'inventariable'
    condition: str = 'nuevo'
    main_category_id: int | None = None
    product_category_id: int | None = None
    category_id: int | None = None
    additional_category_ids: str = ''
    characteristic_tags: str = ''
    brand_id: int | None = None
    engine_series_id: int | None = None
    unit: str = 'unidad'
    compatible_brand: str = ''
    compatible_model: str = ''
    year_from: str = ''
    year_to: str = ''
    fuel_type: str = ''
    displacement_cc: str = ''
    cylinders: str = ''
    oem_primary: str = ''
    oem_compatible_codes: str = ''
    compatible_engine_series_tags: str = ''
    price_sale: Decimal = Decimal('0')
    offer_discount_percent: Decimal = Decimal('10')
    price_offer: Decimal = Decimal('0')
    price_wholesale: Decimal = Decimal('0')
    price_min_authorized: Decimal = Decimal('0')
    prices_linked: bool = True
    stock_min: Decimal = Decimal('1')
    currency: str = 'GTQ'
    tax_rate: Decimal = Decimal('12')
    description: str = ''
    internal_notes: str = ''
    sale_notes: str = ''
    is_active: bool = True

class ProductRead(ProductCreate):
    id: int
    company_id: int
    model_config = {'from_attributes': True}

class LotCreate(BaseModel):
    @field_validator('product_id', 'warehouse_id', 'parent_lot_id', mode='before')
    @classmethod
    def empty_string_to_none(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value

    product_id: int
    warehouse_id: int | None = None
    lot_code: str = ''
    barcode: str = ''
    qr_code: str = ''
    engine_number: str = ''
    serial_number: str = ''
    location: str = ''
    quantity_initial: Decimal = Decimal('0')
    physical_initial_qty: Decimal | None = None
    accounting_initial_qty: Decimal | None = None
    unit_cost: Decimal = Decimal('0')
    cost_includes_tax: bool = True
    is_out_of_accounting_inventory: bool = False
    is_sellable: bool = True
    is_blocked: bool = False
    inventory_status: str = 'disponible'
    is_disassemblable: bool = False
    disassembly_status: str = 'no_aplica'
    parent_lot_id: int | None = None
    purchase_id: int | None = None
    purchase_document_reference: str = ''
    purchase_date: str = ''
    supplier_name: str = ''
    supplier_tax_id: str = ''
    import_policy_number: str = ''
    import_port: str = ''
    import_date: str = ''
    notes: str = ''

class LotRead(LotCreate):
    sale_price: Decimal = Decimal('0')
    special_lot_price: Decimal = Decimal('0')
    condition: str = ''  # legado DB: en v14 la condición operativa vive en producto maestro
    id: int
    company_id: int
    quantity_available: Decimal
    physical_qty: Decimal
    accounting_qty: Decimal
    reserved_qty: Decimal
    pending_exit_qty: Decimal
    blocked_qty: Decimal
    original_cost: Decimal
    distributed_cost: Decimal
    pending_cost_to_distribute: Decimal
    is_active: bool
    model_config = {'from_attributes': True}

    @computed_field
    @property
    def available_physical(self) -> Decimal:
        return self.physical_qty - self.reserved_qty - self.blocked_qty

    @computed_field
    @property
    def available_accounting(self) -> Decimal:
        return self.accounting_qty - self.reserved_qty - self.blocked_qty

class KardexRead(BaseModel):
    id: int
    company_id: int
    product_id: int
    lot_id: int | None
    warehouse_id: int | None
    movement_type: str
    reference_type: str
    reference_id: str
    affects_physical: bool
    affects_accounting: bool
    quantity: Decimal
    unit_cost: Decimal
    physical_balance_after: Decimal
    accounting_balance_after: Decimal
    balance_after: Decimal
    notes: str
    model_config = {'from_attributes': True}

class InventorySummary(BaseModel):
    products: int
    lots: int
    warehouses: int
    physical_units: Decimal
    accounting_units: Decimal
    available_physical: Decimal
    available_accounting: Decimal
    out_accounting_lots: int
    disassemblable_lots: int

class WarehouseExitLineCreate(BaseModel):
    @field_validator('lot_id', mode='before')
    @classmethod
    def lot_to_int(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value
    lot_id: int
    quantity: Decimal = Decimal('1')
    unit_price_reference: Decimal = Decimal('0')
    notes: str = ''

class WarehouseExitCreate(BaseModel):
    client_name: str = 'Consumidor final'
    client_tax_id: str = 'CF'
    notes: str = ''
    internal_notes: str = ''
    lines: list[WarehouseExitLineCreate]

class WarehouseExitLineRead(BaseModel):
    id: int
    company_id: int
    exit_id: int
    product_id: int
    lot_id: int
    warehouse_id: int | None
    description: str
    quantity: Decimal
    unit_price_reference: Decimal
    total_reference: Decimal
    physical_before: Decimal
    physical_after: Decimal
    accounting_before: Decimal
    accounting_after: Decimal
    invoice_status: str
    notes: str
    model_config = {'from_attributes': True}

class WarehouseExitRead(BaseModel):
    id: int
    company_id: int
    exit_code: str
    client_name: str
    client_tax_id: str
    warehouse_id: int | None
    status: str
    is_invoiced: bool
    invoice_reference: str
    notes: str
    internal_notes: str
    total_reference: Decimal
    is_active: bool
    model_config = {'from_attributes': True}




class SalesInvoiceLineCreate(BaseModel):
    @field_validator('lot_id', mode='before')
    @classmethod
    def lot_to_int(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value
    lot_id: int
    quantity: Decimal = Decimal('1')
    unit_price: Decimal = Decimal('0')
    notes: str = ''

class SalesInvoiceDirectCreate(BaseModel):
    client_name: str = 'Consumidor final'
    client_tax_id: str = 'CF'
    notes: str = ''
    internal_notes: str = ''
    lines: list[SalesInvoiceLineCreate]

class VoidDocumentCreate(BaseModel):
    reason: str = 'Anulación operativa'

class SalesInvoiceCreateFromExit(BaseModel):
    warehouse_exit_id: int
    notes: str = ''

class SalesInvoiceLineRead(BaseModel):
    id: int
    company_id: int
    invoice_id: int
    source_exit_line_id: int | None
    product_id: int
    lot_id: int | None
    warehouse_id: int | None
    description: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    total_line: Decimal
    affects_physical: bool
    affects_accounting: bool
    physical_before: Decimal
    physical_after: Decimal
    accounting_before: Decimal
    accounting_after: Decimal
    notes: str
    model_config = {'from_attributes': True}

class SalesInvoiceRead(BaseModel):
    id: int
    company_id: int
    invoice_code: str
    source_exit_id: int | None
    client_name: str
    client_tax_id: str
    status: str
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    notes: str
    internal_notes: str
    is_active: bool
    model_config = {'from_attributes': True}



class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    tax_id: str = 'CF'
    contact_name: str = ''
    phone: str = ''
    email: str = ''
    address: str = ''
    price_type: str = 'normal'
    discount_percent: Decimal = Decimal('0')
    seller_name: str = ''
    notes: str = ''


class CustomerRead(CustomerCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}


class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    tax_id: str = 'CF'
    contact_name: str = ''
    phone: str = ''
    email: str = ''
    address: str = ''
    notes: str = ''


class SupplierRead(SupplierCreate):
    id: int
    company_id: int
    is_active: bool
    model_config = {'from_attributes': True}


class PurchaseLineCreate(BaseModel):
    @field_validator('product_id', 'warehouse_id', mode='before')
    @classmethod
    def empty_string_to_none(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value

    product_id: int
    warehouse_id: int | None = None
    lot_code: str = ''
    quantity: Decimal = Decimal('1')
    unit_cost_with_tax: Decimal = Decimal('0')
    is_out_of_accounting_inventory: bool = False
    notes: str = ''


class PurchaseCreate(BaseModel):
    supplier_name: str = 'Proveedor general'
    status: str = 'registrada'  # borrador o registrada
    supplier_tax_id: str = 'CF'
    warehouse_id: int | None = None
    document_reference: str = ''
    notes: str = ''
    internal_notes: str = ''
    lines: list[PurchaseLineCreate]




class PurchaseUpdate(BaseModel):
    supplier_name: str = 'Proveedor general'
    supplier_tax_id: str = 'CF'
    warehouse_id: int | None = None
    document_reference: str = ''
    notes: str = ''
    internal_notes: str = ''
    lines: list[PurchaseLineCreate]


class PurchaseLineRead(BaseModel):
    id: int
    company_id: int
    purchase_id: int
    product_id: int
    lot_id: int | None
    warehouse_id: int | None
    description: str
    quantity: Decimal
    unit_cost_with_tax: Decimal
    line_total_with_tax: Decimal
    is_out_of_accounting_inventory: bool
    physical_before: Decimal
    physical_after: Decimal
    accounting_before: Decimal
    accounting_after: Decimal
    notes: str
    model_config = {'from_attributes': True}


class PurchaseRead(BaseModel):
    id: int
    company_id: int
    purchase_code: str
    supplier_name: str
    supplier_tax_id: str
    warehouse_id: int | None
    status: str
    document_reference: str
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    notes: str
    internal_notes: str
    is_active: bool
    model_config = {'from_attributes': True}


class CatalogOverview(BaseModel):
    categories: int
    brands: int
    characteristics: int
    engine_series: int
    warehouses: int
    vehicle_models: int = 0
    deleted_items: int = 0
    automation_ready_series: int
    categories_with_rules: int


class AutomationSuggestion(BaseModel):
    source: str
    source_id: int
    brand_name: str = ''
    fuel_type: str = ''
    displacement_cc: str = ''
    cylinders: str = ''
    equivalent_series: str = ''
    sku_prefix: str = ''
    icon: str = ''
    color: str = ''
    sort_order: int = 0
    requires_engine_series: bool = False
    handles_inventory: bool = True
    product_type_suggestion: str = ''
    notes: str = ''


class CatalogImportRequest(BaseModel):
    catalog_type: str
    csv_text: str

class CatalogImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = []

class CatalogTrashItem(BaseModel):
    catalog_type: str
    catalog_label: str
    id: int
    title: str
    subtitle: str = ''
