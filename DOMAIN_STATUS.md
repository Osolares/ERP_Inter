# DOMAIN_STATUS — ERP Intermotores v16.10.1

## Dominio actual
Inventario · Productos

## Cambios aplicados en código
- Productos usa columna **No.** automática.
- Productos muestra **Fecha** como segunda columna y ordena por `created_at` descendente por defecto.
- Filtro principal de productos cambia de enfoque: se agrega filtro por **Características**.
- Filtros de productos pasan a diseño responsive con `flex-wrap`, evitando que se salgan de la pantalla.
- Tabla de productos aplica color de fila según estado visual calculado:
  - rojo: inactivo, fuera de inventario o sin stock;
  - amarillo/anaranjado: disponible menor o igual al stock mínimo;
  - verde suave: disponible sano;
  - gris: neutro.
- Panel lateral de productos ampliado con información relevante: fecha, categoría, serie motor, disponible, físico, contable, lotes, stock mínimo, OEM y características.
- Dashboard Inventario → Nuevo producto ya no abre el formulario antiguo embebido; redirige a `/inventory/products?create=1` para abrir el CRUD principal de Productos.
- Botón `+` de Serie motor desde Productos deja de crear una serie mínima con solo nombre/código y redirige al CRUD completo de Series motor.
- Versión visible actualizada a `ERP v16.10.1`.

## Pendiente del mismo dominio
- Convertir Productos a componentes compartidos físicos `ERPDataGrid`, `ERPPanel`, `ERPFilters`, `ERPForm` cuando el proyecto tenga la carpeta shared final.
- Llevar colores por estado a configuración persistente.
- Agregar panel lateral equivalente en Lotes, Compras, Salidas y Facturas.
- Revisar página de Atributos contra modelos actuales.

## Siguiente sprint recomendado
v16.10.2 — Lotes + Compras consolidados: documento de compra con encabezado y tabla embebida de lotes, CRUD de proveedor desde compra, creación de compra desde lote, y resumen real de existencias.
