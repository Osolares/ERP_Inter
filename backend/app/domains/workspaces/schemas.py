from pydantic import BaseModel
from typing import Any

class SmartKPI(BaseModel):
    key: str
    label: str
    value: float | int | str
    helper: str = ''
    severity: str = 'info'
    target_filter: str = ''

class QuickAction(BaseModel):
    key: str
    label: str
    icon: str = ''
    workspace: str = ''
    target: str = ''
    description: str = ''
    enabled: bool = True

class WorkspaceEntity(BaseModel):
    entity_type: str
    id: int
    title: str
    subtitle: str = ''
    status: str = ''
    summary: dict[str, Any] = {}
    actions: list[QuickAction] = []

class WorkspaceOverview(BaseModel):
    version: str
    message: str
    kpis: list[SmartKPI]
    alerts: list[dict[str, Any]]
    actions: list[QuickAction]
    inventory_context: dict[str, Any]
    commercial_context: dict[str, Any]
    purchases_context: dict[str, Any]
    automotive_context: dict[str, Any]

class WorkspaceSearchResult(BaseModel):
    query: str
    total: int
    results: list[WorkspaceEntity]
