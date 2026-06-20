# ADR-0002 — Core de Inventario Base + Automatización Dev

## Decisión

El inventario forma parte del Core de Negocio, no de un módulo opcional.

## Motivo

Productos, lotes, existencias y Kardex serán usados por compras, ventas, POS, WooCommerce, reportes y futuras integraciones. Si inventario se dispersa entre módulos, el ERP puede generar inconsistencias.

## Regla

Ningún módulo externo modifica inventario directamente. Toda operación debe pasar por servicios oficiales del dominio de inventario.

## Alcance inicial

- Categorías
- Marcas
- Series de motor
- Bodegas
- Productos
- Lotes
- Kardex inicial

## Consecuencia

Compras y ventas se conectarán a inventario por servicios, no por actualización directa de tablas.
