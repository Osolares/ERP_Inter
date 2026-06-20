# PROJECT_STATE — ERP Intermotores v16.10.1

Base usada: `ERP_Intermotores_v16_9_1_CONSOLIDACION_REAL_INVENTARIO_CATALOGOS.zip`.

Este avance NO reinicia el proyecto. Es un sprint incremental sobre la arquitectura v16.

## Módulo actual
Inventario · Productos.

## Cambios reales aplicados
Ver `DOMAIN_STATUS.md` y `CHANGELOG.md`.

## Ejecución automática
```powershell
.\dev.ps1
```

## Ejecución manual si falla dev.ps1

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

o:

```powershell
ng serve
```

## Validación realizada en este entorno
```powershell
python -m compileall -q backend/app
```

`ng build` no se ejecutó porque el entregable liviano no incluye `node_modules`.


---

## Estado anterior preservado

# PROJECT STATE — ERP Intermotores

## Versión estable candidata
v16.9.0 — Consolidación Inventario / Comercial Pro

## Base anterior
v16.8.0 — Facturación / Salidas / Cotizaciones Detalladas

## Estado
En validación por usuario.

## Cambios críticos
- Inventario: Productos, Lotes, Categorías y Catálogos quedan como páginas principales.
- Comercial: tablas corregidas para dark/light.
- Categorías: singular y prefijo único quedan listos para automatización de nombres, SKU y lotes.
- Lotes: stock/costo siguen viviendo en lote; precio sigue viviendo en producto.

## Siguiente bloque recomendado
v17.0.0 — Motor de Inventario Inteligente y validación operativa completa antes de WooCommerce/FEL.


## v16.9.1 Consolidación real Inventario/Catálogos
- Corrige y conecta categorías, atributos, marcas/modelos, series, productos y lotes.
- Sidebar con submenús mejor distribuido.
- Lotes reorganizados: General + Stock protegido, QR/barras automáticos, número motor obligatorio solo en motores.
- Catálogos/Atributos con CRUD completo y página propia de Marcas/Modelos.
