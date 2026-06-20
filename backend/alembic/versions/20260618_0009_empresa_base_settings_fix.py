"""empresa base y settings estable

Revision ID: 20260618_0009
Revises: 20260618_0008
Create Date: 2026-06-18
"""
from alembic import op
import sqlalchemy as sa

revision = '20260618_0009'
down_revision = '20260618_0008'
branch_labels = None
depends_on = None


def upgrade():
    # Asegura que el dominio Empresa exista antes de sembrar configuración.
    # Esto repara bases creadas con versiones anteriores donde la FK existe,
    # pero todavía no hay empresa base id=1.
    op.execute("""
        INSERT INTO companies (
            id,
            name,
            trade_name,
            tax_id,
            timezone,
            date_format,
            time_format,
            is_active,
            created_at,
            updated_at,
            is_deleted,
            deleted_at
        )
        VALUES (
            1,
            'Intermotores',
            'Intermotores',
            'CF',
            'America/Guatemala',
            'dd/MM/yyyy',
            'HH:mm:ss',
            true,
            NOW(),
            NOW(),
            false,
            NULL
        )
        ON CONFLICT (id) DO UPDATE SET
            name = COALESCE(NULLIF(companies.name, ''), EXCLUDED.name),
            trade_name = COALESCE(NULLIF(companies.trade_name, ''), EXCLUDED.trade_name),
            tax_id = COALESCE(NULLIF(companies.tax_id, ''), EXCLUDED.tax_id),
            timezone = COALESCE(NULLIF(companies.timezone, ''), EXCLUDED.timezone),
            date_format = COALESCE(NULLIF(companies.date_format, ''), EXCLUDED.date_format),
            time_format = COALESCE(NULLIF(companies.time_format, ''), EXCLUDED.time_format),
            is_active = true,
            is_deleted = false,
            updated_at = NOW();
    """)
    op.execute("SELECT setval(pg_get_serial_sequence('companies','id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM companies), 1), true);")


def downgrade():
    # No se elimina la empresa base para no romper FK históricas.
    pass
