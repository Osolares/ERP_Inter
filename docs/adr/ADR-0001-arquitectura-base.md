# ADR-0001 — Arquitectura base ERP Intermotores v14

## Decisión
Usar monolito modular profesional:

- Backend FastAPI por dominios
- Frontend Angular por features
- PostgreSQL como motor oficial inicial
- SQLAlchemy para evitar acoplar el núcleo a SQL específico innecesario
- API versionada `/api/v1`
- Multiempresa por `company_id`
- Soft delete en registros de negocio
- Configuración centralizada
- Integraciones desacopladas

## Motivo
El objetivo es operar un negocio pequeño/mediano con herramientas útiles, evitando sobreingeniería y evitando repetir problemas de v13.

## Regla principal
El Core Técnico y el Core de Negocio no deben depender de integraciones externas.
