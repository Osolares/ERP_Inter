# Manual del desarrollador — ERP Intermotores v14

## Reglas

1. No copiar código de v13.
2. No tocar tablas críticas directamente desde módulos externos.
3. Toda operación crítica debe pasar por servicios del dominio.
4. Usar migraciones Alembic.
5. Mantener versión visible actualizada.
6. Mantener README actualizado.
7. No agregar herramientas que no aporten operación real.

## Backend
Cada dominio debe iniciar simple:

- models.py
- schemas.py
- service.py
- repository.py
- routes.py
- permissions.py
- tests/

## Frontend
Cada feature debe tener componentes standalone y usar componentes reutilizables cuando aplique.
