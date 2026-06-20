# ADR-0003 - Inventario físico/contable, salidas y desarmes

## Estado
Aprobado para v14.1.3.

## Decisión
ERP Intermotores v14 separa existencia física y existencia contable desde lotes. El producto maestro solo muestra cálculos agregados y no guarda stock/costo real.

## Reglas
- Salida de bodega: afecta físico, no contable por defecto.
- Factura desde salida: afecta contable, no físico.
- Factura directa: afecta físico y contable.
- Producto fuera de inventario: puede operar con alerta y permisos, sin afectar inventario contable.
- Lote fuera de inventario contable: puede ser vendible, pero no suma existencia contable ni valorización.
- Desarme: será documento formal; en v14.1.3 queda la base de datos preparada con lote padre/hijo, desarmable y costos distribuidos.

## Consecuencia
Se evita el doble descuento físico al facturar salidas y se conserva trazabilidad para compras, ventas, POS, WooCommerce, reportes y desarmes.
