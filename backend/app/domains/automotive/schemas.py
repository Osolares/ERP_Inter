from decimal import Decimal
from pydantic import BaseModel

class AutomotiveMetric(BaseModel):
    label: str
    value: str | int | float
    hint: str = ''
    status: str = 'neutral'

class FieldSpec(BaseModel):
    field: str
    label: str
    source: str
    input_type: str
    required: bool = False
    autocomplete: str = ''
    notes: str = ''

class BusinessRule(BaseModel):
    code: str
    title: str
    area: str
    description: str
    applies_to: list[str]
    status: str = 'propuesta'

class CompatibilityTemplate(BaseModel):
    brand: str = ''
    model: str = ''
    generation: str = ''
    year_from: str = ''
    year_to: str = ''
    engine_series: str = ''
    fuel_type: str = ''
    displacement_cc: str = ''
    observations: str = ''

class AutomationRule(BaseModel):
    code: str
    title: str
    trigger: str
    actions: list[str]
    configurable: bool = True
    status: str = 'activa'

class SkuRulePreview(BaseModel):
    category_prefix: str = ''
    engine_prefix: str = ''
    condition: str = 'nuevo'
    characteristic: str = ''
    sequence: int = 1

class SkuRuleResult(BaseModel):
    sku: str
    lot_code_suggestion: str
    explanation: list[str]

class CompatibilityPreviewRequest(BaseModel):
    engine_series_code: str = ''
    brand: str = ''
    model: str = ''
    year_from: str = ''
    year_to: str = ''

class CompatibilityPreview(BaseModel):
    engine_series_code: str
    suggested: list[CompatibilityTemplate]
    warnings: list[str] = []

class DocumentDescriptionRequest(BaseModel):
    sku: str = ''
    product_name: str = ''
    condition: str = ''
    engine_series: str = ''
    oem: str = ''
    lot_code: str = ''
    engine_number: str = ''
    notes: str = ''

class DocumentDescriptionResult(BaseModel):
    description: str
    parts_used: list[str]

class ProductAutomationPreviewRequest(BaseModel):
    sku: str = ''
    name: str = ''
    category_name: str = ''
    engine_series_code: str = ''
    price_sale: Decimal = Decimal('0')
    price_offer: Decimal = Decimal('0')
    discount_percent: Decimal = Decimal('10')
    prices_linked: bool = True

class ProductAutomationPreview(BaseModel):
    suggested_sku: str
    suggested_name: str
    fuel_type: str = ''
    displacement_cc: str = ''
    cylinders: str = ''
    brand_name: str = ''
    category_rules: list[str]
    price_sale: Decimal
    price_offer: Decimal
    description_template: str
    warnings: list[str]

class AutomotiveOverview(BaseModel):
    metrics: list[AutomotiveMetric]
    product_fields: list[FieldSpec]
    lot_fields: list[FieldSpec]
    document_rules: list[BusinessRule]
    disassembly_rules: list[BusinessRule]
    automation_rules: list[AutomationRule]
    compatibility_templates: list[CompatibilityTemplate]
    v13_lessons: list[str]


class AutomotiveSearchRequest(BaseModel):
    query: str = ''
    limit: int = 20

class AutomotiveSearchResult(BaseModel):
    entity: str
    id: int | None = None
    title: str
    subtitle: str = ''
    code: str = ''
    status: str = ''
    action_hint: str = ''

class AutomotiveSearchResponse(BaseModel):
    query: str
    total: int
    results: list[AutomotiveSearchResult]
    suggestions: list[str] = []

class OemNormalizeRequest(BaseModel):
    oem_primary: str = ''
    oem_compatible_codes: str = ''

class OemNormalizeResult(BaseModel):
    primary: str
    compatible: list[str]
    normalized: str
    warnings: list[str] = []

class ProductLotAssistantRequest(BaseModel):
    product_name: str = ''
    sku: str = ''
    category_name: str = ''
    engine_series_code: str = ''
    condition: str = 'usado'
    lot_code: str = ''
    engine_number: str = ''
    unit_cost: Decimal = Decimal('0')
    sale_price: Decimal = Decimal('0')
    quantity: Decimal = Decimal('1')

class ProductLotAssistantResult(BaseModel):
    product_summary: dict
    lot_summary: dict
    required_fields: list[str]
    warnings: list[str]
    next_actions: list[str]
