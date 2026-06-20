from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.domains.identity.models import Role, Permission
from app.domains.settings.service import COMPANY_ID, ensure_default_company

PERMISSIONS = [
    ('settings.view','Configuración: ver'), ('settings.edit','Configuración: editar'), ('settings.reset','Configuración: restablecer'),
    ('inventory.view','Inventario: ver'), ('inventory.create','Inventario: crear'), ('inventory.edit','Inventario: editar'), ('inventory.delete','Inventario: enviar a papelera'), ('inventory.restore','Inventario: restaurar'), ('inventory.export','Inventario: exportar'), ('inventory.costs.view','Inventario: ver costos'),
    ('purchases.view','Compras: ver'), ('purchases.create','Compras: crear'), ('purchases.edit_draft','Compras: editar borrador'), ('purchases.register','Compras: registrar'), ('purchases.cancel','Compras: anular'),
    ('sales.view','Ventas: ver'), ('sales.create','Ventas: crear'), ('sales.cancel','Ventas: anular'), ('sales.print','Ventas: imprimir'),
    ('pos.view','POS: ver'), ('pos.sell','POS: vender'), ('pos.discount','POS: aplicar descuento'), ('pos.pending','POS: guardar pendientes'),
    ('admin.permissions.view','Permisos: ver'), ('admin.permissions.manage','Permisos: administrar'),
]

ROLE_PERMISSIONS = {
    'admin': [p[0] for p in PERMISSIONS],
    'ventas': ['inventory.view','sales.view','sales.create','sales.print','pos.view','pos.sell','pos.discount','pos.pending'],
    'inventario': ['inventory.view','inventory.create','inventory.edit','inventory.export','inventory.costs.view','purchases.view'],
    'compras': ['inventory.view','inventory.costs.view','purchases.view','purchases.create','purchases.edit_draft','purchases.register'],
}

ROLE_NAMES = {
    'admin': 'Administrador',
    'ventas': 'Ventas',
    'inventario': 'Inventario',
    'compras': 'Compras',
}


def ensure_security_schema(db: Session) -> None:
    ensure_default_company(db)
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        )
    """))
    db.flush()


def seed_permissions(db: Session) -> None:
    ensure_security_schema(db)
    now = datetime.now(timezone.utc)
    for code, description in PERMISSIONS:
        permission = db.query(Permission).filter(Permission.code == code).first()
        if not permission:
            db.add(Permission(code=code, description=description, created_at=now, updated_at=now))
    db.flush()
    permissions_by_code = {p.code: p for p in db.query(Permission).all()}
    for role_code, role_name in ROLE_NAMES.items():
        role = db.query(Role).filter(Role.company_id == COMPANY_ID, Role.code == role_code).first()
        if not role:
            role = Role(company_id=COMPANY_ID, code=role_code, name=role_name, created_at=now, updated_at=now, is_deleted=False)
            db.add(role)
            db.flush()
        role.is_deleted = False
        role.name = role_name
        for perm_code in ROLE_PERMISSIONS.get(role_code, []):
            perm = permissions_by_code.get(perm_code)
            if perm:
                db.execute(text("""
                    INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (:role_id, :permission_id)
                    ON CONFLICT DO NOTHING
                """), {'role_id': role.id, 'permission_id': perm.id})
    db.commit()


def overview(db: Session):
    seed_permissions(db)
    permissions = db.query(Permission).order_by(Permission.code).all()
    roles = db.query(Role).filter(Role.company_id == COMPANY_ID, Role.is_deleted == False).order_by(Role.code).all()
    rows = db.execute(text("""
        SELECT r.code AS role_code, p.code AS permission_code
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.company_id = :company_id
        ORDER BY r.code, p.code
    """), {'company_id': COMPANY_ID}).mappings().all()
    by_role = {}
    for row in rows:
        by_role.setdefault(row['role_code'], []).append(row['permission_code'])
    return {
        'permissions': [{
            'id': p.id,
            'code': p.code,
            'description': p.description,
            'module': p.code.split('.')[0],
            'action': '.'.join(p.code.split('.')[1:]),
        } for p in permissions],
        'roles': [{
            'id': r.id,
            'code': r.code,
            'name': r.name,
            'permissions': by_role.get(r.code, []),
        } for r in roles]
    }
