# CHANGELOG

## v16.10.1 — Productos consolidado inicial

### Implementado
- Columna No. en tabla de Productos.
- Columna Fecha en tabla de Productos.
- Orden por defecto por fecha de creación descendente.
- Filtro por Características en Productos.
- Filtros responsive en varias filas para evitar desbordamiento horizontal.
- Colores de fila por estado visual de inventario.
- Panel lateral de Productos con resumen ampliado y lotes relacionados.
- Dashboard Inventario redirige Nuevo producto al CRUD principal de Productos.
- QuickCreate de Serie motor redirige al CRUD completo de Series motor.
- Versión visible actualizada a v16.10.1.

### Validación
- Backend validado con `python -m compileall -q backend/app`.
- Frontend no pudo compilarse en este entorno porque el ZIP liviano no incluye `node_modules`; `tsc` reporta dependencias Angular faltantes (`@angular/core`, `@angular/forms`, `tslib`).

# Changelog

## v16.9.0 — Consolidación Inventario / Comercial Pro

- Reparación del modo oscuro en tablas comerciales, facturación, salidas y cotizaciones.
- Sidebar reorganizado con submenús colapsables por Workspace.
- Categorías separadas visualmente en Principales y Producto.
- Categorías de producto con categoría padre, nombre singular, prefijo único, icono, color y orden.
- CRUD de categorías con edición real.
- Catálogos/Atributos ampliado con CRUD para combustibles, CC, cilindros, condición, unidades, tipos, ubicaciones y puertos.
- CRUD de marcas y características desde Catálogos/Atributos.
- Producto: estado e inventariable como switches tipo pastilla.
- Producto: características/tipos regresan al formulario principal.
- Producto: pestañas reordenadas y sección automotriz prioriza Serie motor, combustible, CC, cilindros y OEM.
- Lotes: formulario simplificado en pestaña General.
- Lotes: cantidad/costo, compra, proveedor, ubicación, importación y notas integradas en General.
- Lotes: código de barras y QR automáticos desde código de lote.
- Lotes: físico y contable inicial se calculan según fuera de inventario contable.
- Lotes: precio de lote oculto por defecto; precio vive en Producto.
- Lotes: número motor obligatorio para categoría principal Motor.
- Código de lote automático por prefijo de categoría de producto con correlativo por categoría.
- Nueva migración `20260619_0015_inventory_consolidation_v1690.py`.
- Angular compilado correctamente.


## v16.9.1 Consolidación real Inventario/Catálogos
- Corrige y conecta categorías, atributos, marcas/modelos, series, productos y lotes.
- Sidebar con submenús mejor distribuido.
- Lotes reorganizados: General + Stock protegido, QR/barras automáticos, número motor obligatorio solo en motores.
- Catálogos/Atributos con CRUD completo y página propia de Marcas/Modelos.
