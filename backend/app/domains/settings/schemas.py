from typing import Any
from pydantic import BaseModel, Field

class SettingRead(BaseModel):
    id: int | None = None
    key: str
    value: str
    value_type: str = 'string'
    group: str = 'general'
    label: str = ''
    description: str = ''
    is_public: bool = False
    model_config = {'from_attributes': True}

class SettingUpdate(BaseModel):
    key: str = Field(min_length=2, max_length=120)
    value: Any = ''
    value_type: str | None = None
    group: str | None = None
    is_public: bool = False

class SettingsBulkUpdate(BaseModel):
    settings: list[SettingUpdate]

class SettingsGrouped(BaseModel):
    company: list[SettingRead] = []
    inventory: list[SettingRead] = []
    products: list[SettingRead] = []
    sales: list[SettingRead] = []
    purchases: list[SettingRead] = []
    documents: list[SettingRead] = []
    integrations: list[SettingRead] = []
    system: list[SettingRead] = []
