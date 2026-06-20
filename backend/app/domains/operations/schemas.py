from pydantic import BaseModel
from typing import Any

class OperationKPI(BaseModel):
    key: str
    label: str
    value: Any
    group: str
    severity: str = 'info'
    hint: str = ''

class OperationAlert(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    workspace: str
    action: str = ''

class OperationTimelineItem(BaseModel):
    id: str
    timestamp: str
    title: str
    detail: str
    workspace: str
    severity: str = 'info'

class OperationsDashboard(BaseModel):
    version: str
    generated_at: str
    kpis: list[OperationKPI]
    alerts: list[OperationAlert]
    timeline: list[OperationTimelineItem]

class AuditEntry(BaseModel):
    id: int
    created_at: str
    action: str
    entity_type: str
    entity_id: str
    detail: str
    ip_address: str = ''
