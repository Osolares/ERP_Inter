from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

class DisassemblyLineCreate(BaseModel):
    @field_validator('product_id', 'warehouse_id', mode='before')
    @classmethod
    def empty_to_none(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value

    product_id: int
    warehouse_id: int | None = None
    lot_code: str = Field(min_length=2, max_length=80)
    description: str = ''
    quantity: Decimal = Decimal('1')
    unit_cost: Decimal = Decimal('0')
    notes: str = ''

class DisassemblyCreate(BaseModel):
    @field_validator('source_lot_id', mode='before')
    @classmethod
    def source_to_int(cls, value):
        if value == '' or value == 'null' or value == 'undefined':
            return None
        return value

    source_lot_id: int
    mode: str = 'parcial'  # parcial, total
    source_qty: Decimal = Decimal('1')
    notes: str = ''
    lines: list[DisassemblyLineCreate]

class DisassemblyLineRead(BaseModel):
    id: int
    company_id: int
    disassembly_id: int
    product_id: int
    warehouse_id: int | None
    lot_code: str
    description: str
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    created_lot_id: int | None
    notes: str
    model_config = {'from_attributes': True}

class DisassemblyRead(BaseModel):
    id: int
    company_id: int
    disassembly_code: str
    source_lot_id: int
    mode: str
    status: str
    source_qty: Decimal
    source_unit_cost: Decimal
    total_cost: Decimal
    allocated_cost: Decimal
    residual_cost: Decimal
    notes: str
    model_config = {'from_attributes': True}

class DisassemblyDetail(BaseModel):
    header: DisassemblyRead
    lines: list[DisassemblyLineRead]

class DisassemblySummary(BaseModel):
    total_disassemblies: int
    active_disassemblies: int
    reversed_disassemblies: int
    disassemblable_lots: int
    pending_cost_review: Decimal
