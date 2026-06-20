# ERP Intermotores v14.2.0 — Foundation

Esta versión estabiliza la base visual y técnica antes de continuar con lotes, salidas, compras, ventas y POS.

## Decisiones principales

- No crear pantallas como CRUD simples; se crearán administradores de trabajo.
- Las alertas se centralizan con `ERPAlertService`.
- Los estados de carga se centralizan con `ERPLoadingService`.
- Todo campo configurable debe venir de configuración global/empresa cuando aplique.
- Costos de lotes se registran con IVA incluido.
- El producto maestro no lleva stock ni costo real.
- La existencia física y contable se controlan por lote y por movimientos.
- Salida de bodega descuenta físico; factura posterior descuenta contable sin duplicar físico.

## Configuración global por defecto

- Moneda: GTQ.
- IVA: 12%.
- Descuento oferta: 10%.
- Zona horaria: America/Guatemala.
- Fecha: dd/MM/yyyy.
- Hora: HH:mm:ss.

## Quality Gate

Antes de entregar ZIP se debe validar:

- Sintaxis crítica de frontend.
- Backend instalable.
- Alembic ejecutable.
- README y CHANGELOG actualizados.
- `dev.ps1` incluido.
- `.env` incluido para entorno local.
