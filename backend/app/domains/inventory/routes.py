from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database.session import get_db
from app.domains.inventory import models, schemas, service

router = APIRouter(prefix='/inventory', tags=['Inventario'])


@router.get('/catalogs/overview', response_model=schemas.CatalogOverview)
def catalogs_overview(db: Session = Depends(get_db)):
    return service.catalog_overview(db)

@router.post('/catalogs/seed-defaults', response_model=schemas.CatalogOverview)
def seed_default_catalogs(db: Session = Depends(get_db)):
    return service.seed_default_catalogs(db)

@router.get('/automation/engine-series/{series_id}', response_model=schemas.AutomationSuggestion)
def engine_series_automation(series_id: int, db: Session = Depends(get_db)):
    item = service.engine_series_automation(db, series_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Serie de motor no encontrada')
    return item

@router.get('/automation/category/{category_id}', response_model=schemas.AutomationSuggestion)
def category_automation(category_id: int, db: Session = Depends(get_db)):
    item = service.category_automation(db, category_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    return item

@router.delete('/catalogs/{catalog_type}/{item_id}')
def delete_catalog_item(catalog_type: str, item_id: int, db: Session = Depends(get_db)):
    try:
        item = service.soft_delete_catalog_item(db, catalog_type, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if item is None:
        raise HTTPException(status_code=404, detail='Registro de catálogo no encontrado')
    return {'ok': True, 'message': 'Registro enviado a papelera correctamente.'}


@router.get('/catalogs/trash', response_model=list[schemas.CatalogTrashItem])
def list_catalog_trash(db: Session = Depends(get_db)):
    return service.list_catalog_trash(db)

@router.post('/catalogs/{catalog_type}/{item_id}/restore')
def restore_catalog_item(catalog_type: str, item_id: int, db: Session = Depends(get_db)):
    try:
        item = service.restore_catalog_item(db, catalog_type, item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if item is None:
        raise HTTPException(status_code=404, detail='Registro de catálogo no encontrado')
    return {'ok': True, 'message': 'Registro restaurado correctamente.'}

@router.post('/catalogs/import-csv', response_model=schemas.CatalogImportResult)
def import_catalog_csv(data: schemas.CatalogImportRequest, db: Session = Depends(get_db)):
    return service.import_catalog_csv(db, data.catalog_type, data.csv_text)

@router.get('/summary', response_model=schemas.InventorySummary)
def inventory_summary(db: Session = Depends(get_db)):
    return service.summary(db)

@router.get('/categories', response_model=list[schemas.CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    return service.list_records(db, models.Category)

@router.post('/categories', response_model=schemas.CategoryRead)
def create_category(data: schemas.CategoryCreate, db: Session = Depends(get_db)):
    try:
        return service.create_category(db, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo guardar la categoría. Revisa nombre o prefijo duplicado.')

@router.put('/categories/{category_id}', response_model=schemas.CategoryRead)
def update_category(category_id: int, data: schemas.CategoryCreate, db: Session = Depends(get_db)):
    try:
        item = service.update_category(db, category_id, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo actualizar la categoría. Revisa nombre o prefijo duplicado.')
    if item is None:
        raise HTTPException(status_code=404, detail='Categoría no encontrada')
    return item

@router.get('/brands', response_model=list[schemas.BrandRead])
def list_brands(db: Session = Depends(get_db)):
    return service.list_records(db, models.Brand)

@router.post('/brands', response_model=schemas.BrandRead)
def create_brand(data: schemas.BrandCreate, db: Session = Depends(get_db)):
    return service.create_brand(db, data)

@router.put('/brands/{item_id}', response_model=schemas.BrandRead)
def update_brand(item_id: int, data: schemas.BrandCreate, db: Session = Depends(get_db)):
    item = service.update_simple_record(db, models.Brand, item_id, data)
    if item is None: raise HTTPException(status_code=404, detail='Marca no encontrada')
    return item


@router.get('/vehicle-models', response_model=list[schemas.VehicleModelRead])
def list_vehicle_models(db: Session = Depends(get_db)):
    return service.list_records(db, models.VehicleModel)

@router.post('/vehicle-models', response_model=schemas.VehicleModelRead)
def create_vehicle_model(data: schemas.VehicleModelCreate, db: Session = Depends(get_db)):
    try:
        return service.create_vehicle_model(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

@router.get('/characteristics', response_model=list[schemas.CharacteristicRead])
def list_characteristics(db: Session = Depends(get_db)):
    return service.list_records(db, models.Characteristic)

@router.post('/characteristics', response_model=schemas.CharacteristicRead)
def create_characteristic(data: schemas.CharacteristicCreate, db: Session = Depends(get_db)):
    return service.create_characteristic(db, data)

@router.put('/characteristics/{item_id}', response_model=schemas.CharacteristicRead)
def update_characteristic(item_id: int, data: schemas.CharacteristicCreate, db: Session = Depends(get_db)):
    item = service.update_simple_record(db, models.Characteristic, item_id, data)
    if item is None: raise HTTPException(status_code=404, detail='Característica no encontrada')
    return item

@router.get('/catalog-values', response_model=list[schemas.CatalogValueRead])
def list_catalog_values(db: Session = Depends(get_db)):
    return service.list_records(db, models.CatalogValue)

@router.post('/catalog-values', response_model=schemas.CatalogValueRead)
def create_catalog_value(data: schemas.CatalogValueCreate, db: Session = Depends(get_db)):
    try:
        return service.create_catalog_value(db, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Valor duplicado en el catálogo seleccionado.')

@router.put('/catalog-values/{value_id}', response_model=schemas.CatalogValueRead)
def update_catalog_value(value_id: int, data: schemas.CatalogValueCreate, db: Session = Depends(get_db)):
    try:
        item = service.update_catalog_value(db, value_id, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo actualizar. Revisa duplicados.')
    if item is None:
        raise HTTPException(status_code=404, detail='Valor de catálogo no encontrado')
    return item

@router.get('/engine-series', response_model=list[schemas.EngineSeriesRead])
def list_engine_series(db: Session = Depends(get_db)):
    return service.list_records(db, models.EngineSeries)

@router.post('/engine-series', response_model=schemas.EngineSeriesRead)
def create_engine_series(data: schemas.EngineSeriesCreate, db: Session = Depends(get_db)):
    return service.create_engine_series(db, data)

@router.put('/engine-series/{item_id}', response_model=schemas.EngineSeriesRead)
def update_engine_series(item_id: int, data: schemas.EngineSeriesCreate, db: Session = Depends(get_db)):
    item = service.update_simple_record(db, models.EngineSeries, item_id, data)
    if item is None:
        raise HTTPException(status_code=404, detail='Serie motor no encontrada')
    return item

@router.get('/warehouses', response_model=list[schemas.WarehouseRead])
def list_warehouses(db: Session = Depends(get_db)):
    return service.list_records(db, models.Warehouse)

@router.post('/warehouses', response_model=schemas.WarehouseRead)
def create_warehouse(data: schemas.WarehouseCreate, db: Session = Depends(get_db)):
    return service.create_warehouse(db, data)

@router.get('/products', response_model=list[schemas.ProductRead])
def list_products(db: Session = Depends(get_db)):
    return service.list_records(db, models.Product)

@router.get('/products/trash', response_model=list[schemas.ProductRead])
def list_products_trash(db: Session = Depends(get_db)):
    return service.list_deleted_products(db)

@router.post('/products', response_model=schemas.ProductRead)
def create_product(data: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        return service.create_product(db, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo guardar el producto. Revisa si el SKU ya existe o si seleccionaste una categoría/marca/serie inválida.')

@router.put('/products/{product_id}', response_model=schemas.ProductRead)
def update_product(product_id: int, data: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        item = service.update_product(db, product_id, data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo actualizar el producto. Revisa si el SKU ya existe o si seleccionaste una categoría/marca/serie inválida.')
    if item is None:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return item

@router.delete('/products/{product_id}', response_model=schemas.ProductRead)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    item = service.soft_delete_product(db, product_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return item

@router.post('/products/{product_id}/restore', response_model=schemas.ProductRead)
def restore_product(product_id: int, db: Session = Depends(get_db)):
    item = service.restore_product(db, product_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Producto no encontrado')
    return item

@router.get('/lots', response_model=list[schemas.LotRead])
def list_lots(db: Session = Depends(get_db)):
    return service.list_records(db, models.Lot)

@router.get('/lots/code-preview/{product_id}')
def lot_code_preview(product_id: int, db: Session = Depends(get_db)):
    try:
        return service.lot_code_preview(db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.post('/lots', response_model=schemas.LotRead)
def create_lot(data: schemas.LotCreate, db: Session = Depends(get_db)):
    try:
        return service.create_lot(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo guardar el lote. Revisa si el código de lote, número motor o producto/bodega son inválidos.')

@router.put('/lots/{lot_id}', response_model=schemas.LotRead)
def update_lot(lot_id: int, data: schemas.LotCreate, db: Session = Depends(get_db)):
    try:
        item = service.update_lot(db, lot_id, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo actualizar el lote. Revisa si el código o número motor ya existen o si seleccionaste producto/bodega inválidos.')
    if item is None:
        raise HTTPException(status_code=404, detail='Lote no encontrado')
    return item

@router.delete('/lots/{lot_id}', response_model=schemas.LotRead)
def delete_lot(lot_id: int, db: Session = Depends(get_db)):
    try:
        item = service.soft_delete_lot(db, lot_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if item is None:
        raise HTTPException(status_code=404, detail='Lote no encontrado')
    return item



@router.get('/warehouse-exits', response_model=list[schemas.WarehouseExitRead])
def list_warehouse_exits(db: Session = Depends(get_db)):
    return service.list_warehouse_exits(db)

@router.post('/warehouse-exits', response_model=schemas.WarehouseExitRead)
def create_warehouse_exit(data: schemas.WarehouseExitCreate, db: Session = Depends(get_db)):
    try:
        return service.create_warehouse_exit(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo crear la salida de bodega. Revisa lotes, cantidades o datos relacionados.')

@router.get('/warehouse-exits/{exit_id}/lines', response_model=list[schemas.WarehouseExitLineRead])
def list_warehouse_exit_lines(exit_id: int, db: Session = Depends(get_db)):
    return service.list_warehouse_exit_lines(db, exit_id)




@router.post('/warehouse-exits/{exit_id}/void', response_model=schemas.WarehouseExitRead)
def void_warehouse_exit(exit_id: int, data: schemas.VoidDocumentCreate | None = None, db: Session = Depends(get_db)):
    try:
        reason = data.reason if data else 'Anulación operativa'
        return service.void_warehouse_exit(db, exit_id, reason=reason)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

@router.get('/sales-invoices', response_model=list[schemas.SalesInvoiceRead])
def list_sales_invoices(db: Session = Depends(get_db)):
    return service.list_sales_invoices(db)

@router.post('/warehouse-exits/{exit_id}/invoice', response_model=schemas.SalesInvoiceRead)
def create_invoice_from_exit(exit_id: int, data: schemas.SalesInvoiceCreateFromExit | None = None, db: Session = Depends(get_db)):
    try:
        notes = data.notes if data else ''
        return service.create_invoice_from_exit(db, exit_id, notes=notes)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo crear la factura desde salida. Revisa el estado de la salida y sus lotes.')


@router.post('/sales-invoices/direct', response_model=schemas.SalesInvoiceRead)
def create_direct_invoice(data: schemas.SalesInvoiceDirectCreate, db: Session = Depends(get_db)):
    try:
        return service.create_direct_invoice(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo crear la factura directa. Revisa lotes, cantidades o datos relacionados.')

@router.post('/sales-invoices/{invoice_id}/void', response_model=schemas.SalesInvoiceRead)
def void_sales_invoice(invoice_id: int, data: schemas.VoidDocumentCreate | None = None, db: Session = Depends(get_db)):
    try:
        reason = data.reason if data else 'Anulación operativa'
        return service.void_sales_invoice(db, invoice_id, reason=reason)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

@router.get('/sales-invoices/{invoice_id}/lines', response_model=list[schemas.SalesInvoiceLineRead])
def list_sales_invoice_lines(invoice_id: int, db: Session = Depends(get_db)):
    return service.list_sales_invoice_lines(db, invoice_id)

@router.get('/kardex', response_model=list[schemas.KardexRead])
def list_kardex(db: Session = Depends(get_db)):
    return service.list_kardex(db)




@router.get('/customers', response_model=list[schemas.CustomerRead])
def list_customers(db: Session = Depends(get_db)):
    return service.list_customers(db)

@router.post('/customers', response_model=schemas.CustomerRead)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db)):
    try:
        return service.create_customer(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo guardar el cliente. Revisa si el NIT ya existe.')


@router.get('/suppliers', response_model=list[schemas.SupplierRead])
def list_suppliers(db: Session = Depends(get_db)):
    return service.list_suppliers(db)

@router.post('/suppliers', response_model=schemas.SupplierRead)
def create_supplier(data: schemas.SupplierCreate, db: Session = Depends(get_db)):
    try:
        return service.create_supplier(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo guardar el proveedor. Revisa si el NIT ya existe.')

@router.get('/suppliers/{supplier_id}/purchases', response_model=list[schemas.PurchaseRead])
def list_supplier_purchases(supplier_id: int, db: Session = Depends(get_db)):
    try:
        return service.list_supplier_purchases(db, supplier_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get('/purchases', response_model=list[schemas.PurchaseRead])
def list_purchases(db: Session = Depends(get_db)):
    return service.list_purchases(db)

@router.post('/purchases', response_model=schemas.PurchaseRead)
def create_purchase(data: schemas.PurchaseCreate, db: Session = Depends(get_db)):
    try:
        return service.create_purchase(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo registrar la compra. Revisa productos, bodegas, cantidades o códigos de lote.')

@router.put('/purchases/{purchase_id}', response_model=schemas.PurchaseRead)
def update_purchase_draft(purchase_id: int, data: schemas.PurchaseUpdate, db: Session = Depends(get_db)):
    try:
        return service.update_purchase_draft(db, purchase_id, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo actualizar la compra en borrador. Revisa productos, bodegas, cantidades o códigos.')

@router.get('/purchases/{purchase_id}/lines', response_model=list[schemas.PurchaseLineRead])
def list_purchase_lines(purchase_id: int, db: Session = Depends(get_db)):
    return service.list_purchase_lines(db, purchase_id)

@router.post('/purchases/{purchase_id}/register', response_model=schemas.PurchaseRead)
def register_purchase(purchase_id: int, db: Session = Depends(get_db)):
    try:
        return service.register_purchase(db, purchase_id)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='No se pudo registrar la compra. Revisa productos, bodegas, cantidades o códigos de lote.')

@router.post('/purchases/{purchase_id}/void', response_model=schemas.PurchaseRead)
def void_purchase(purchase_id: int, data: schemas.VoidDocumentCreate | None = None, db: Session = Depends(get_db)):
    try:
        reason = data.reason if data else 'Anulación de compra'
        return service.void_purchase(db, purchase_id, reason=reason)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))
