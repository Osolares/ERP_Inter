from pydantic import BaseModel
from typing import Any

class ReportKPI(BaseModel):
    key: str
    label: str
    value: float | int | str
    suffix: str = ''
    hint: str = ''
    group: str = 'general'

class ReportRow(BaseModel):
    label: str
    value: float | int | str
    extra: str = ''
    amount: float = 0

class WorkspaceReport(BaseModel):
    workspace: str
    title: str
    description: str
    kpis: list[ReportKPI]
    rows: list[ReportRow]

class ReportsDashboard(BaseModel):
    version: str
    generated_at: str
    kpis: list[ReportKPI]
    workspaces: list[WorkspaceReport]
