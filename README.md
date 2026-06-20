# ERP Intermotores v16.10.1 — Productos consolidado inicial

Sprint incremental sobre `ERP_Intermotores_v16_9_1_CONSOLIDACION_REAL_INVENTARIO_CATALOGOS`.

## Cambios principales

- Tabla de Productos con columna **No.**.
- Tabla de Productos con columna **Fecha** después de No. y orden descendente por fecha de creación.
- Filtro por **Características** agregado en Productos.
- Filtros responsive en varias filas para que no se salgan de pantalla.
- Colores de fila por estado visual de producto/inventario.
- Panel lateral ampliado al seleccionar producto.
- Dashboard Inventario → Nuevo producto redirige al CRUD principal de Productos.
- Botón `+` de Serie motor redirige al CRUD completo de Series motor.
- Versión visible del sidebar: `ERP v16.10.1`.

## Ejecutar automático

```powershell
.\dev.ps1
```

## Modo manual si falla el automático

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm start
```

Alternativa:

```powershell
ng serve
```

## Validación realizada

```powershell
python -m compileall -q backend/app
```

No se ejecutó `ng build` en este entorno porque el ZIP liviano no incluye `node_modules`.

## Siguiente sprint

v16.10.2 — Lotes + Compras consolidados: documento profesional de compra con encabezado + tabla embebida de lotes, CRUD de proveedor desde compra y creación de compra desde lotes.

---

# ERP Intermotores v16.9.0

Consolidación de Inventario y Comercial basada en las observaciones de uso real y reglas rescatadas de v13, pero manteniendo arquitectura v16.

## Ejecución recomendada

```powershell
powershell -ExecutionPolicy Bypass -File .\dev.ps1
```

## Ejecución manual

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

```powershell
cd frontend
npm install
npm start
```

## Pruebas sugeridas

1. Ejecutar migraciones.
2. Abrir `/commercial/facturacion`, `/commercial/salidas` y `/commercial/cotizaciones` en modo oscuro.
3. Abrir `/inventory/categories` y crear categoría principal y categoría de producto con singular y prefijo.
4. Confirmar que prefijo no se duplica.
5. Abrir `/inventory/attributes` y crear/editar combustibles, CC, cilindros, condición, unidades y características.
6. Crear producto con característica/tipo y switches Activo/Inventariable.
7. Crear lote sin código y confirmar correlativo por categoría.
8. Confirmar que código barras y QR se completan automáticamente.
9. Crear lote motor sin número motor y validar bloqueo.
10. Confirmar sidebar colapsable.


## v16.9.1 Consolidación real Inventario/Catálogos
- Corrige y conecta categorías, atributos, marcas/modelos, series, productos y lotes.
- Sidebar con submenús mejor distribuido.
- Lotes reorganizados: General + Stock protegido, QR/barras automáticos, número motor obligatorio solo en motores.
- Catálogos/Atributos con CRUD completo y página propia de Marcas/Modelos.
