"""core administrativo profesional

Revision ID: 20260618_0010
Revises: 20260618_0009
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0010'
down_revision = '20260618_0009'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            trade_name VARCHAR(160) NOT NULL DEFAULT '',
            tax_id VARCHAR(32) NOT NULL DEFAULT '',
            timezone VARCHAR(64) NOT NULL DEFAULT 'America/Guatemala',
            date_format VARCHAR(24) NOT NULL DEFAULT 'dd/MM/yyyy',
            time_format VARCHAR(24) NOT NULL DEFAULT 'HH:mm:ss',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ NULL
        );
    """)
    op.execute("""
        INSERT INTO companies (id, name, trade_name, tax_id, timezone, date_format, time_format, is_active, created_at, updated_at, is_deleted, deleted_at)
        VALUES (1, 'Intermotores', 'Intermotores', 'CF', 'America/Guatemala', 'dd/MM/yyyy', 'HH:mm:ss', true, NOW(), NOW(), false, NULL)
        ON CONFLICT (id) DO UPDATE SET is_active=true, is_deleted=false, updated_at=NOW();
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
            PRIMARY KEY (role_id, permission_id)
        );
    """)
    op.execute("""
        INSERT INTO permissions (code, description, created_at, updated_at)
        VALUES
        ('settings.view','Configuración: ver',NOW(),NOW()),
        ('settings.edit','Configuración: editar',NOW(),NOW()),
        ('settings.reset','Configuración: restablecer',NOW(),NOW()),
        ('inventory.view','Inventario: ver',NOW(),NOW()),
        ('inventory.create','Inventario: crear',NOW(),NOW()),
        ('inventory.edit','Inventario: editar',NOW(),NOW()),
        ('inventory.delete','Inventario: enviar a papelera',NOW(),NOW()),
        ('inventory.restore','Inventario: restaurar',NOW(),NOW()),
        ('inventory.export','Inventario: exportar',NOW(),NOW()),
        ('inventory.costs.view','Inventario: ver costos',NOW(),NOW()),
        ('purchases.view','Compras: ver',NOW(),NOW()),
        ('purchases.create','Compras: crear',NOW(),NOW()),
        ('purchases.edit_draft','Compras: editar borrador',NOW(),NOW()),
        ('purchases.register','Compras: registrar',NOW(),NOW()),
        ('purchases.cancel','Compras: anular',NOW(),NOW()),
        ('sales.view','Ventas: ver',NOW(),NOW()),
        ('sales.create','Ventas: crear',NOW(),NOW()),
        ('sales.cancel','Ventas: anular',NOW(),NOW()),
        ('sales.print','Ventas: imprimir',NOW(),NOW()),
        ('pos.view','POS: ver',NOW(),NOW()),
        ('pos.sell','POS: vender',NOW(),NOW()),
        ('pos.discount','POS: aplicar descuento',NOW(),NOW()),
        ('pos.pending','POS: guardar pendientes',NOW(),NOW()),
        ('admin.permissions.view','Permisos: ver',NOW(),NOW()),
        ('admin.permissions.manage','Permisos: administrar',NOW(),NOW())
        ON CONFLICT (code) DO UPDATE SET description=EXCLUDED.description, updated_at=NOW();
    """)
    op.execute("""
        INSERT INTO roles (company_id, name, code, created_at, updated_at, is_deleted, deleted_at)
        VALUES
        (1,'Administrador','admin',NOW(),NOW(),false,NULL),
        (1,'Ventas','ventas',NOW(),NOW(),false,NULL),
        (1,'Inventario','inventario',NOW(),NOW(),false,NULL),
        (1,'Compras','compras',NOW(),NOW(),false,NULL)
        ON CONFLICT DO NOTHING;
    """)


def downgrade():
    pass
