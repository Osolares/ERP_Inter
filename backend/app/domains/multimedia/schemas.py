from pydantic import BaseModel, Field
from datetime import datetime

class MediaAssetCreate(BaseModel):
    target_type: str = Field(default='product')
    target_id: int = Field(default=0)
    asset_type: str = Field(default='image')
    title: str = ''
    description: str = ''
    alt_text: str = ''
    source_url: str = ''
    mime_type: str = ''
    size_bytes: int = 0
    tags: str = ''
    sort_order: int = 0
    is_primary: bool = False
    origin: str = 'erp'

class MediaAssetRead(MediaAssetCreate):
    id: int
    company_id: int
    uploaded_by: str
    is_active: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    model_config = {'from_attributes': True}

class MediaAssetUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    alt_text: str | None = None
    source_url: str | None = None
    tags: str | None = None
    sort_order: int | None = None
    is_primary: bool | None = None

class LabelTemplateRead(BaseModel):
    id: int
    code: str
    name: str
    template_type: str
    paper_size: str
    width_mm: int
    height_mm: int
    variables: str
    body_template: str
    is_default: bool
    is_active: bool
    model_config = {'from_attributes': True}

class LabelPreviewRequest(BaseModel):
    template_code: str = 'LOT_80MM'
    target_type: str = 'lot'
    target_id: int = 0
    sku: str = ''
    name: str = ''
    lot_code: str = ''
    barcode: str = ''
    qr_value: str = ''
    price: str = ''
    location: str = ''

class LabelPreviewResponse(BaseModel):
    template_code: str
    html: str
    variables_used: list[str]
    qr_value: str
    barcode_value: str

class QrBarcodeResponse(BaseModel):
    target_type: str
    target_id: int
    qr_value: str
    barcode_value: str
    label_hint: str

class MultimediaOverview(BaseModel):
    total_assets: int
    images: int
    documents: int
    primary_assets: int
    trash: int
    templates: int
    supported_targets: list[str]
