from pydantic import BaseModel

class PermissionRead(BaseModel):
    id: int | None = None
    code: str
    description: str = ''
    module: str = ''
    action: str = ''
    model_config = {'from_attributes': True}

class RoleRead(BaseModel):
    id: int | None = None
    code: str
    name: str
    permissions: list[str] = []
    model_config = {'from_attributes': True}

class AdminOverview(BaseModel):
    roles: list[RoleRead]
    permissions: list[PermissionRead]
