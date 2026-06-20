import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

const API = 'http://localhost:8000/api/v1/inventory';

type Summary = {
  products: number; lots: number; warehouses: number;
  physical_units: string; accounting_units: string;
  available_physical: string; available_accounting: string;
  out_accounting_lots: number; disassemblable_lots: number;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toast" *ngIf="toast()">{{ toast() }}</div>

    <div class="erp-alert-backdrop" *ngIf="alert()" (click)="closeAlert()"></div>
    <section class="erp-alert" *ngIf="alert()" [class.danger-alert]="alert()?.type === 'danger'" [class.success-alert]="alert()?.type === 'success'" [class.warning-alert]="alert()?.type === 'warning'">
      <div class="erp-alert-icon">{{ alert()?.icon }}</div>
      <div class="erp-alert-body">
        <h3>{{ alert()?.title }}</h3>
        <p>{{ alert()?.message }}</p>
        <small *ngIf="alert()?.detail">{{ alert()?.detail }}</small>
        <div class="erp-alert-actions">
          <button class="btn" type="button" *ngIf="alert()?.confirm" (click)="closeAlert()">Cancelar</button>
          <button class="btn primary wide-auto" type="button" (click)="acceptAlert()">{{ alert()?.confirm ? 'Sí, continuar' : 'Aceptar' }}</button>
        </div>
      </div>
    </section>

    <div class="page-header inventory-hero">
      <div>
        <span class="eyebrow">📦 ERP v15.2.0 · Workspace Inventario Profesional</span>
        <h1>Administrador de productos</h1>
        <p>Centro de trabajo visual para operar inventario sin perder contexto: productos, lotes, salidas, facturas, Kardex y acciones rápidas.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" [disabled]="loading()" (click)="loadAll()">🔄 Actualizar</button>
        <button class="btn primary wide-auto" type="button" (click)="openNewProduct()">➕ Nuevo producto</button>
      </div>
    </div>

    <section class="smart-toolbar">
      <button class="tool active" type="button" (click)="openNewProduct()">➕ Nuevo</button>
      <button class="tool" type="button" (click)="tab.set('productos')">🧩 Productos</button>
      <button class="tool" type="button" (click)="tab.set('papelera')">🗑️ Papelera</button>
      <button class="tool" type="button" (click)="tab.set('catalogos')">🗂️ Catálogos</button>
      <button class="tool" type="button" (click)="tab.set('lotes')">🏷️ Lotes</button>
      <button class="tool" type="button" (click)="tab.set('compras')">📥 Compras</button>
      <button class="tool" type="button" (click)="tab.set('clientes')">👥 Clientes</button>
      <button class="tool" type="button" (click)="tab.set('existencias')">📊 Existencias</button>
      <button class="tool" type="button" (click)="tab.set('salidas')">🚚 Salidas</button>
      <button class="tool" type="button" (click)="tab.set('facturas')">🧾 Facturas</button>
      <button class="tool pos-tool" type="button" (click)="openPOS()">🛒 POS</button>
      <button class="tool" type="button" (click)="exportProductsCsv()">📤 Exportar productos</button>
      <button class="tool" type="button" (click)="exportLotsCsv()">📤 Exportar lotes</button>
      <button class="tool" type="button" (click)="printInventorySummary()">🖨️ Imprimir resumen</button>
      <button class="tool" type="button" (click)="showModuleSettings()">⚙️ Configuración</button>
    </section>

    <section class="alert-card">
      <strong>Regla crítica:</strong> producto maestro no lleva stock ni costo real. Las existencias y costos viven en lotes; los costos de lote se registran con IVA incluido.
    </section>

    <section class="metric-grid pro-metrics">
      <article class="metric action-metric" (click)="tab.set('productos')"><span>🧩 Productos</span><strong>{{ summary()?.products || 0 }}</strong><small>Ver administrador</small></article>
      <article class="metric action-metric" (click)="tab.set('lotes')"><span>🏷️ Lotes</span><strong>{{ summary()?.lots || 0 }}</strong><small>Ver lotes</small></article>
      <article class="metric"><span>📦 Físico</span><strong>{{ summary()?.physical_units || 0 }}</strong></article>
      <article class="metric"><span>📚 Contable</span><strong>{{ summary()?.accounting_units || 0 }}</strong></article>
      <article class="metric"><span>✅ Disponible físico</span><strong>{{ summary()?.available_physical || 0 }}</strong></article>
      <article class="metric"><span>🧾 Disponible contable</span><strong>{{ summary()?.available_accounting || 0 }}</strong></article>
      <article class="metric action-metric" (click)="tab.set('lotes'); lotSearch=''"><span>⚠️ Fuera contable</span><strong>{{ summary()?.out_accounting_lots || 0 }}</strong><small>Revisar alertas</small></article>
      <article class="metric action-metric" (click)="tab.set('lotes')"><span>🔧 Desarmables</span><strong>{{ summary()?.disassemblable_lots || 0 }}</strong><small>Preparado para desarmes</small></article>
    </section>

    <section class="workspace-brief card workspace-maturity">
      <div>
        <h3>🧭 Workspace Inventario Profesional</h3>
        <p class="muted">v15.2.0 consolida Inventario como centro operativo: productos, lotes, existencias, Kardex, compras, salidas y facturas relacionadas en un solo lugar.</p>
      </div>
      <div class="ops-grid compact-grid">
        <button type="button" class="ops-card" (click)="tab.set('productos')"><span>🧩 Productos activos</span><strong>{{ filteredProducts().length }}</strong><small>Maestro sin stock ni costo real</small></button>
        <button type="button" class="ops-card" (click)="tab.set('lotes')"><span>🏷️ Lotes operativos</span><strong>{{ filteredLots().length }}</strong><small>Existencia física/contable</small></button>
        <button type="button" class="ops-card" (click)="tab.set('kardex')"><span>📒 Kardex</span><strong>{{ kardex().length }}</strong><small>Trazabilidad inicial</small></button>
        <button type="button" class="ops-card" (click)="tab.set('catalogos')"><span>🗂️ Catálogos</span><strong>{{ categories().length + brands().length + engineSeries().length }}</strong><small>Base automotriz reutilizable</small></button>
      </div>
      <div class="brief-actions">
        <button class="btn wide-auto" type="button" (click)="tab.set('productos')">🧩 Productos</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('lotes')">🏷️ Lotes</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('compras')">📥 Compras</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('clientes')">👥 Clientes</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('salidas')">🚚 Salidas</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('facturas')">🧾 Facturas</button>
        <button class="btn wide-auto" type="button" (click)="tab.set('kardex')">📒 Kardex</button>
      </div>
    </section>

    <section class="operations-center card">
      <div class="table-header">
        <div>
          <h3>⭐ Centro de operaciones de inventario</h3>
          <p class="muted">Alertas útiles para revisar datos incompletos, existencias bajas y lotes que requieren atención.</p>
        </div>
        <button class="btn wide-auto" type="button" (click)="exportInventorySnapshot()">📦 Exportar snapshot</button>
      </div>
      <div class="ops-grid">
        <button type="button" class="ops-card" (click)="focusProductsWithoutLots()"><span>📦 Productos sin lote</span><strong>{{ productsWithoutLotsCount() }}</strong><small>Crear inventario inicial</small></button>
        <button type="button" class="ops-card" (click)="focusProductsWithoutPrice()"><span>💲 Productos sin precio</span><strong>{{ productsWithoutPriceCount() }}</strong><small>Completar precio venta</small></button>
        <button type="button" class="ops-card" (click)="focusLowStockLots()"><span>⚠️ Lotes bajo stock</span><strong>{{ lowStockLotsCount() }}</strong><small>Disponible físico ≤ 1</small></button>
        <button type="button" class="ops-card" (click)="focusBlockedLots()"><span>🔒 Lotes bloqueados</span><strong>{{ blockedLotsCount() }}</strong><small>Revisar vendibilidad</small></button>
        <button type="button" class="ops-card" (click)="focusOutAccountingLots()"><span>📚 Fuera contable</span><strong>{{ summary()?.out_accounting_lots || 0 }}</strong><small>Regularización futura</small></button>
      </div>
    </section>

    <div class="tabs">
      <button class="tab" [class.active]="tab() === 'productos'" (click)="tab.set('productos')">🧩 Productos</button>
      <button class="tab" [class.active]="tab() === 'papelera'" (click)="tab.set('papelera')">🗑️ Papelera</button>
      <button class="tab" [class.active]="tab() === 'lotes'" (click)="tab.set('lotes')">🏷️ Lotes</button>
      <button class="tab" [class.active]="tab() === 'compras'" (click)="tab.set('compras')">📥 Compras</button>
      <button class="tab" [class.active]="tab() === 'clientes'" (click)="tab.set('clientes')">👥 Clientes</button>
      <button class="tab" [class.active]="tab() === 'existencias'" (click)="tab.set('existencias')">📊 Existencias</button>
      <button class="tab" [class.active]="tab() === 'salidas'" (click)="tab.set('salidas')">🚚 Salidas</button>
      <button class="tab" [class.active]="tab() === 'facturas'" (click)="tab.set('facturas')">🧾 Facturas</button>
      <button class="tab pos-tab" [class.active]="tab() === 'pos'" (click)="openPOS()">🛒 POS</button>
      <button class="tab" [class.active]="tab() === 'catalogos'" (click)="tab.set('catalogos')">🗂️ Catálogos</button>
      <button class="tab" [class.active]="tab() === 'kardex'" (click)="tab.set('kardex')">📒 Kardex</button>
    </div>

    <section class="products-workspace" *ngIf="tab() === 'productos'">
      <aside class="filter-panel card">
        <h3>🔎 Filtros</h3>
        <label>Búsqueda global<input [(ngModel)]="productSearch" placeholder="SKU, nombre, OEM, serie..." /></label>
        <label>Tipo<select [(ngModel)]="filterType"><option value="">Todos</option><option value="repuesto">Repuesto</option><option value="motor">Motor</option><option value="servicio">Servicio</option><option value="kit">Kit</option><option value="accesorio">Accesorio</option></select></label>
        <label>Modo inventario<select [(ngModel)]="filterInventory"><option value="">Todos</option><option value="inventariable">Dentro de inventario</option><option value="fuera_inventario">Fuera de inventario</option><option value="servicio">Servicio/no inventariable</option></select></label>
        <label>Condición<select [(ngModel)]="filterCondition"><option value="">Todas</option><option value="nuevo">Nuevo</option><option value="usado">Usado</option><option value="reconstruido">Reconstruido</option><option value="importado">Importado</option></select></label>
        <button class="btn wide-auto" type="button" (click)="clearFilters()">🧹 Limpiar filtros</button>
        <div class="mini-help">💡 En esta fase los filtros son rápidos locales. Luego agregaremos filtros backend, paginación y columnas configurables.</div>
      </aside>

      <article class="card table-card">
        <div class="table-header">
          <div><h3>📋 Productos activos</h3><p class="muted">{{ filteredProducts().length }} producto(s) visibles</p></div>
          <button class="btn primary wide-auto" type="button" (click)="openNewProduct()">➕ Nuevo producto</button>
        </div>
        <div class="table-wrap pro-table">
          <table>
            <thead><tr><th>SKU</th><th>Producto</th><th>Clasificación</th><th>Automotriz</th><th>Precios</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let p of filteredProducts()" [class.selected]="selectedProduct()?.id === p.id">
                <td (click)="selectProduct(p)"><strong>{{ p.sku }}</strong><br><small>{{ p.short_name || 'Sin nombre corto' }}</small></td>
                <td (click)="selectProduct(p)">{{ p.name }}<br><span class="chip">{{ p.condition || 'nuevo' }}</span> <span class="chip soft">{{ p.inventory_mode }}</span></td>
                <td (click)="selectProduct(p)">{{ p.product_type }}<br><small>{{ p.characteristic_tags || 'Sin características' }}</small></td>
                <td (click)="selectProduct(p)">{{ p.fuel_type || '—' }} {{ p.displacement_cc || '' }}<br><small>OEM: {{ p.oem_primary || '—' }}</small></td>
                <td (click)="selectProduct(p)">Venta: <strong>Q {{ p.price_sale || 0 }}</strong><br><small>Oferta: Q {{ p.price_offer || 0 }}</small></td>
                <td class="row-actions"><button class="btn small" (click)="openEditProduct(p)">✏️</button><button class="btn small danger" (click)="sendToTrash(p)">🗑️</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="info-panel card">
        <h3>ℹ️ Resumen</h3>
        <ng-container *ngIf="selectedProduct(); else noSelected">
          <div class="context-avatar">📦</div>
          <h4>{{ selectedProduct()?.sku }}</h4><p>{{ selectedProduct()?.name }}</p>
          <div class="context-chips"><span class="chip">{{ selectedProduct()?.condition }}</span><span class="chip soft">{{ selectedProduct()?.inventory_mode }}</span></div>
          <div class="info-list"><span>Tipo</span><strong>{{ selectedProduct()?.product_type }}</strong><span>Lotes</span><strong>{{ productLots(selectedProduct()?.id).length }}</strong><span>Físico</span><strong>{{ productTotals(selectedProduct()?.id).physical }}</strong><span>Contable</span><strong>{{ productTotals(selectedProduct()?.id).accounting }}</strong><span>Precio venta</span><strong>Q {{ selectedProduct()?.price_sale || 0 }}</strong><span>Última salida</span><strong>{{ lastExitForProduct(selectedProduct()?.id) }}</strong></div>
          <div class="quick-actions">
            <button class="btn small" (click)="openEditProduct(selectedProduct())">✏️ Editar</button>
            <button class="btn small" (click)="quickNewLotFromProduct(selectedProduct())">🏷️ Crear lote</button><button class="btn small" (click)="quickPurchaseFromProduct(selectedProduct())">📥 Comprar</button>
            <button class="btn small" (click)="tab.set('kardex')">📒 Kardex</button>
            <button class="btn small danger" (click)="sendToTrash(selectedProduct())">🗑️ Papelera</button>
          </div>
          <div class="related-list" *ngIf="productLots(selectedProduct()?.id).length">
            <strong>Lotes relacionados</strong>
            <button type="button" class="related-item" *ngFor="let l of productLots(selectedProduct()?.id).slice(0,3)" (click)="selectLot(l); tab.set('lotes')">{{ l.lot_code }} · físico {{ l.physical_qty }} · contable {{ l.accounting_qty }}</button>
          </div>
        </ng-container>
        <ng-template #noSelected><p class="muted">Selecciona un producto para ver el resumen, lotes relacionados, auditoría y accesos rápidos.</p></ng-template>
      </aside>
    </section>

    <section class="card" *ngIf="tab() === 'papelera'">
      <div class="table-header"><div><h3>🗑️ Papelera de productos</h3><p class="muted">Soft delete: los productos no se eliminan físicamente.</p></div><button class="btn" (click)="loadAll()">🔄 Actualizar</button></div>
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Producto</th><th>Tipo</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let p of deletedProducts()"><td>{{ p.sku }}</td><td>{{ p.name }}</td><td>{{ p.product_type }}</td><td><button class="btn small" (click)="restoreProduct(p)">♻️ Restaurar</button></td></tr></tbody></table></div>
    </section>

    <section class="lots-workspace" *ngIf="tab() === 'lotes'">
      <article class="card pro-card lot-form-card">
        <div class="table-header">
          <div>
            <h3>{{ editingLotId() ? '✏️ Editar lote' : '🏷️ Nuevo lote' }}</h3>
            <p class="muted">El lote maneja existencia física, existencia contable y costo real con IVA incluido.</p>
          </div>
          <button class="btn wide-auto" type="button" (click)="resetLotForm()">➕ Nuevo</button>
        </div>

        <div class="alert-card compact">
          <strong>Regla:</strong> las existencias no se editan libremente; se originan por entradas, salidas, ventas, ajustes o regularizaciones. En esta fase se permite el ingreso inicial del lote.
        </div>

        <div class="form-grid">
          <label>Producto *
            <select [(ngModel)]="lot.product_id" (ngModelChange)="applyProductToLot()">
              <option [ngValue]="null">Seleccionar producto...</option>
              <option *ngFor="let p of products()" [ngValue]="p.id">{{ p.sku }} — {{ p.name }}</option>
            </select>
          </label>
          <label>Bodega *
            <select [(ngModel)]="lot.warehouse_id">
              <option [ngValue]="null">Seleccionar bodega...</option>
              <option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </label>
          <label>Código lote *<input [(ngModel)]="lot.lot_code" placeholder="Auto sugerido por SKU" /></label>
          <label>Ubicación interna<input [(ngModel)]="lot.location" placeholder="ESTANTERÍA, PASILLO..." /></label>
          <label>Número motor<input [(ngModel)]="lot.engine_number" /></label>
          <label>Número serie<input [(ngModel)]="lot.serial_number" /></label>
          <label>Estado inventario
            <select [(ngModel)]="lot.inventory_status">
              <option value="disponible">Disponible</option><option value="reservado">Reservado</option><option value="bloqueado">Bloqueado</option><option value="en_desarme">En desarme</option><option value="desarmado">Desarmado</option>
            </select>
          </label>
        </div>

        <div class="section-title">Existencia inicial</div>
        <div class="form-grid">
          <label>Cantidad física inicial<input type="number" [(ngModel)]="lot.physical_initial_qty" [disabled]="editingLotId() !== null" (ngModelChange)="syncAccountingQty()" /></label>
          <label>Cantidad contable inicial<input type="number" [(ngModel)]="lot.accounting_initial_qty" [disabled]="editingLotId() !== null || lot.is_out_of_accounting_inventory" /></label>
          <label>Costo unitario con IVA incluido<input type="number" [(ngModel)]="lot.unit_cost" /></label>
          <label>Precio especial por lote<input type="number" [(ngModel)]="lot.special_lot_price" /></label>
        </div>

        <div class="flag-grid">
          <label class="check pill"><input type="checkbox" [(ngModel)]="lot.is_out_of_accounting_inventory" (change)="onOutAccountingChange()" /> ⚠️ Fuera de inventario contable</label>
          <label class="check pill"><input type="checkbox" [(ngModel)]="lot.is_sellable" /> ✅ Vendible</label>
          <label class="check pill"><input type="checkbox" [(ngModel)]="lot.is_blocked" /> 🔒 Bloqueado</label>
          <label class="check pill"><input type="checkbox" [(ngModel)]="lot.is_disassemblable" (change)="lot.disassembly_status = lot.is_disassemblable ? 'pendiente' : 'no_aplica'" /> 🔧 Desarmable</label>
        </div>

        <label>Notas / comentarios internos<textarea [(ngModel)]="lot.notes"></textarea></label>
        <div class="drawer-footer inline-footer">
          <button class="btn" type="button" (click)="resetLotForm()">Cancelar</button>
          <button class="btn primary wide-auto" [disabled]="saving()" (click)="saveLot()">{{ saving() ? 'Guardando...' : (editingLotId() ? '💾 Actualizar lote' : '💾 Guardar lote') }}</button>
        </div>
      </article>

      <article class="card table-card">
        <div class="table-header">
          <div><h3>📋 Lotes registrados</h3><p class="muted">{{ filteredLots().length }} lote(s) visibles</p></div>
          <input class="search-inline" [(ngModel)]="lotSearch" placeholder="Buscar lote, producto, motor, ubicación..." />
          <select class="search-inline small-select" [(ngModel)]="lotStatusFilter"><option value="">Todos</option><option value="bajo_stock">Bajo stock</option><option value="bloqueado">Bloqueados</option><option value="fuera_contable">Fuera contable</option><option value="desarmable">Desarmables</option></select>
        </div>
        <div class="table-wrap pro-table"><table><thead><tr><th>Código</th><th>Producto</th><th>Existencias</th><th>Costo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let l of filteredLots()" [class.selected]="selectedLot()?.id === l.id" (click)="selectLot(l)">
            <td><strong>{{ l.lot_code }}</strong><br><small>{{ l.engine_number || l.serial_number || 'Sin motor/serie' }}</small></td>
            <td>{{ productName(l.product_id) }}<br><small>{{ l.location || 'Sin ubicación' }}</small></td>
            <td><span class="chip">Físico {{ l.physical_qty }}</span> <span class="chip soft">Contable {{ l.accounting_qty }}</span><br><small>Disp. físico {{ l.available_physical }} / contable {{ l.available_accounting }}</small></td>
            <td>Q {{ l.unit_cost || 0 }}<br><small>IVA incluido</small></td>
            <td><span class="chip" *ngIf="l.is_out_of_accounting_inventory">Fuera contable</span><span class="chip" *ngIf="l.is_disassemblable">Desarmable</span><span class="chip soft" *ngIf="l.is_blocked">Bloqueado</span></td>
            <td class="row-actions" (click)="$event.stopPropagation()"><button class="btn small" (click)="openEditLot(l)">✏️</button><button class="btn small danger" (click)="sendLotToTrash(l)">🗑️</button></td>
          </tr>
        </tbody></table></div>
      </article>

      <aside class="card info-panel lot-info">
        <h3>📊 Existencia del lote</h3>
        <ng-container *ngIf="selectedLot(); else noLot">
          <h4>{{ selectedLot()?.lot_code }}</h4>
          <div class="info-list"><span>Producto</span><strong>{{ productName(selectedLot()?.product_id) }}</strong><span>Físico</span><strong>{{ selectedLot()?.physical_qty }}</strong><span>Contable</span><strong>{{ selectedLot()?.accounting_qty }}</strong><span>Disponible físico</span><strong>{{ selectedLot()?.available_physical }}</strong><span>Disponible contable</span><strong>{{ selectedLot()?.available_accounting }}</strong><span>Costo unitario</span><strong>Q {{ selectedLot()?.unit_cost }}</strong><span>Desarme</span><strong>{{ selectedLot()?.disassembly_status }}</strong></div>
          <div class="quick-actions"><button class="btn small" (click)="openEditLot(selectedLot())">✏️ Editar</button><button class="btn small" [disabled]="lotAvailablePhysical(selectedLot()) <= 0" (click)="quickExitFromLot(selectedLot())">🚚 Crear salida</button><button class="btn small" (click)="tab.set('kardex')">📒 Ver Kardex</button></div>
          <div class="mini-help">Las salidas de bodega descontarán físico; la factura posterior descontará contable sin duplicar el físico.</div>
        </ng-container>
        <ng-template #noLot><p class="muted">Selecciona un lote para ver físico, contable, disponibilidad, alertas y preparación para salidas/desarmes.</p></ng-template>
      </aside>
    </section>




    <section class="clientes-workspace" *ngIf="tab() === 'clientes'">
      <article class="card pro-card">
        <div class="table-header">
          <div><h3>👥 Administrador de clientes</h3><p class="muted">Clientes reales para salidas, facturación y ventas. Desde aquí se pueden seleccionar sin duplicar datos.</p></div>
          <button class="btn" type="button" (click)="resetCustomerForm()">➕ Nuevo</button>
        </div>
        <div class="form-grid">
          <label>Nombre/Razón social *<input [(ngModel)]="customer.name" placeholder="Consumidor final" /></label>
          <label>NIT<input [(ngModel)]="customer.tax_id" placeholder="CF" /></label>
          <label>Contacto<input [(ngModel)]="customer.contact_name" /></label>
          <label>Teléfono<input [(ngModel)]="customer.phone" /></label>
          <label>Correo<input [(ngModel)]="customer.email" /></label>
          <label>Tipo de precio<select [(ngModel)]="customer.price_type"><option value="normal">Normal</option><option value="mayorista">Mayorista</option><option value="especial">Especial</option></select></label>
          <label>Descuento %<input type="number" [(ngModel)]="customer.discount_percent" /></label>
          <label>Vendedor asignado<input [(ngModel)]="customer.seller_name" /></label>
        </div>
        <label>Dirección<textarea [(ngModel)]="customer.address"></textarea></label>
        <label>Comentarios internos<textarea [(ngModel)]="customer.notes"></textarea></label>
        <div class="drawer-footer inline-footer"><button class="btn" type="button" (click)="resetCustomerForm()">Cancelar</button><button class="btn primary wide-auto" type="button" [disabled]="saving()" (click)="createCustomer()">💾 Guardar cliente</button></div>
      </article>
      <article class="card table-card">
        <div class="table-header"><div><h3>📋 Clientes registrados</h3><p class="muted">Selecciona un cliente para usarlo en salidas o facturas.</p></div><input class="search-inline" [(ngModel)]="customerSearch" placeholder="Buscar cliente, NIT, teléfono o correo..." /></div>
        <div class="table-wrap pro-table"><table><thead><tr><th>Cliente</th><th>NIT</th><th>Contacto</th><th>Precio</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let c of filteredCustomers()"><td><strong>{{ c.name }}</strong><br><small>{{ c.address || 'Sin dirección' }}</small></td><td>{{ c.tax_id }}</td><td>{{ c.phone || '—' }}<br><small>{{ c.email || '—' }}</small></td><td>{{ c.price_type }}<br><small>{{ c.discount_percent || 0 }}% descuento</small></td><td><button class="btn small" type="button" (click)="selectCustomer(c)">✅ Usar</button><button class="btn small" type="button" (click)="prepareCustomerForSale(c)">🚚 Salida</button><button class="btn small" type="button" (click)="prepareCustomerForInvoice(c)">🧾 Factura</button></td></tr>
        </tbody></table></div>
      </article>
    </section>


    <section class="compras-workspace" *ngIf="tab() === 'compras'">
      <article class="card pro-card">
        <div class="table-header">
          <div>
            <h3>{{ editingPurchaseId() ? '✏️ Editar compra en borrador' : '📥 Nueva compra' }}</h3>
            <p class="muted">Crea documentos de compra como borrador o registrada. Al registrar se crean lotes, se usa costo con IVA incluido y se genera Kardex de entrada.</p>
          </div>
          <button class="btn" type="button" (click)="resetPurchaseForm()">➕ Nueva</button>
        </div>
        <div class="alert-card compact"><strong>Regla:</strong> una compra en borrador no afecta inventario. Una compra registrada crea lotes, aumenta físico/contable cuando aplica y puede anularse si sus lotes no tuvieron movimientos posteriores.</div>

        <div class="supplier-panel">
          <div class="supplier-list">
            <div class="section-title">Proveedor existente</div>
            <input [(ngModel)]="supplierSearch" placeholder="Buscar proveedor por nombre, NIT, teléfono o correo..." />
            <div class="supplier-chips">
              <button class="chip-btn" type="button" *ngFor="let s of filteredSuppliers().slice(0, 8)" (click)="selectSupplier(s)">🏢 {{ s.name }} · {{ s.tax_id }}</button>
            </div>
          </div>
          <div class="supplier-quick">
            <div class="section-title">Crear proveedor rápido</div>
            <div class="form-grid compact-grid">
              <label>Nombre<input [(ngModel)]="supplier.name" placeholder="Nombre proveedor" /></label>
              <label>NIT<input [(ngModel)]="supplier.tax_id" placeholder="CF" /></label>
              <label>Teléfono<input [(ngModel)]="supplier.phone" /></label>
              <label>Correo<input [(ngModel)]="supplier.email" /></label>
            </div>
            <button class="btn small" type="button" (click)="createSupplier()">➕ Crear y seleccionar proveedor</button>
          </div>
        </div>
        <div class="form-grid">
          <label>Proveedor<input [(ngModel)]="purchase.supplier_name" placeholder="Proveedor general" /></label>
          <label>NIT<input [(ngModel)]="purchase.supplier_tax_id" placeholder="CF" /></label>
          <label>Referencia documento<input [(ngModel)]="purchase.document_reference" placeholder="Factura proveedor, póliza, recibo..." /></label>
          <label>Estado inicial
            <select [(ngModel)]="purchase.status">
              <option value="registrada">Registrar de una vez</option>
              <option value="borrador">Guardar como borrador</option>
            </select>
          </label>
          <label>Bodega
            <select [(ngModel)]="purchase.warehouse_id">
              <option [ngValue]="null">Bodega por defecto</option>
              <option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.code }} — {{ w.name }}</option>
            </select>
          </label>
        </div>
        <div class="section-title">Agregar línea de compra</div>
        <div class="form-grid">
          <label>Producto *
            <select [(ngModel)]="purchaseLine.product_id" (ngModelChange)="applyProductToPurchase()">
              <option [ngValue]="null">Seleccionar producto...</option>
              <option *ngFor="let p of products()" [ngValue]="p.id">{{ p.sku }} — {{ p.name }}</option>
            </select>
          </label>
          <label>Código lote<input [(ngModel)]="purchaseLine.lot_code" placeholder="Vacío = autogenerado" /></label>
          <label>Cantidad<input type="number" [(ngModel)]="purchaseLine.quantity" /></label>
          <label>Costo unitario con IVA incluido<input type="number" [(ngModel)]="purchaseLine.unit_cost_with_tax" /></label>
        </div>
        <label class="check pill"><input type="checkbox" [(ngModel)]="purchaseLine.is_out_of_accounting_inventory" /> ⚠️ Línea fuera de inventario contable</label>
        <div class="drawer-footer inline-footer"><button class="btn" type="button" (click)="addPurchaseLine()">➕ Agregar línea</button><span class="muted">Total estimado: <strong>Q {{ purchaseTotal() }}</strong></span></div>
        <div class="table-wrap mini-table" *ngIf="purchaseLines.length">
          <table><thead><tr><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Costo</th><th>Total</th><th></th></tr></thead><tbody>
            <tr *ngFor="let line of purchaseLines; let i = index"><td>{{ productName(line.product_id) }}</td><td>{{ line.lot_code || 'Autogenerado' }}</td><td>{{ line.quantity }}</td><td>Q {{ line.unit_cost_with_tax }}</td><td>Q {{ invoiceLineTotal(line) }}</td><td><button class="btn small danger" type="button" (click)="removePurchaseLine(i)">🗑️</button></td></tr>
          </tbody></table>
        </div>
        <label>Notas de compra<textarea [(ngModel)]="purchase.notes"></textarea></label>
        <div class="drawer-footer inline-footer">
          <button class="btn" type="button" (click)="resetPurchaseForm()">Cancelar</button>
          <button class="btn" type="button" [disabled]="saving()" (click)="savePurchaseDraft()">📝 Guardar borrador</button>
          <button class="btn primary wide-auto" type="button" [disabled]="saving()" (click)="createPurchase()">{{ saving() ? 'Guardando...' : (editingPurchaseId() ? '💾 Actualizar borrador' : (purchase.status === 'borrador' ? '📝 Guardar según estado' : '💾 Registrar compra')) }}</button>
        </div>
      </article>

      <article class="card table-card">
        <div class="table-header">
          <div><h3>📋 Compras registradas</h3><p class="muted">Selecciona una compra para ver sus líneas y acciones.</p></div>
          <button class="btn" type="button" (click)="loadAll()">🔄 Actualizar</button>
        </div>
        <div class="table-wrap pro-table">
          <table>
            <thead><tr><th>Código</th><th>Proveedor</th><th>Documento</th><th>Estado</th><th>Total con IVA</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let c of purchases()" [class.selected]="selectedPurchase()?.id === c.id" (click)="selectPurchase(c)">
                <td><strong>{{ c.purchase_code }}</strong></td>
                <td>{{ c.supplier_name }}<br><small>{{ c.supplier_tax_id }}</small></td>
                <td>{{ c.document_reference || '—' }}</td>
                <td><span class="chip" [class.danger-chip]="c.status === 'anulada'">{{ c.status }}</span></td>
                <td>Q {{ c.total || 0 }}</td>
                <td>
                  <button class="btn small" type="button" (click)="$event.stopPropagation(); selectPurchase(c)">👁️ Detalle</button>
                  <button class="btn small" type="button" *ngIf="c.status === 'borrador'" (click)="$event.stopPropagation(); editPurchaseDraft(c)">✏️ Editar borrador</button><button class="btn small" type="button" *ngIf="c.status === 'borrador'" (click)="$event.stopPropagation(); registerPurchase(c)">✅ Registrar</button>
                  <button class="btn small" type="button" (click)="$event.stopPropagation(); printPurchase(c)">🖨️ Imprimir</button>
                  <button class="btn small danger" type="button" [disabled]="c.status === 'anulada'" (click)="$event.stopPropagation(); voidPurchase(c)">↩️ Anular</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="purchase-detail" *ngIf="selectedPurchase()">
          <h4>Detalle {{ selectedPurchase()?.purchase_code }}</h4>
          <p class="muted">{{ selectedPurchase()?.supplier_name }} · {{ selectedPurchase()?.document_reference || 'Sin referencia' }} · Estado: {{ selectedPurchase()?.status }}</p>
          <div class="brief-actions">
            <button class="btn small" type="button" *ngIf="selectedPurchase()?.status === 'borrador'" (click)="editPurchaseDraft(selectedPurchase())">✏️ Editar borrador</button><button class="btn small" type="button" *ngIf="selectedPurchase()?.status === 'borrador'" (click)="registerPurchase(selectedPurchase())">✅ Registrar compra</button>
            <button class="btn small" type="button" (click)="printPurchase(selectedPurchase())">🖨️ Imprimir / PDF base</button>
          </div>
          <div class="table-wrap mini-table"><table><thead><tr><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Costo</th><th>Físico</th><th>Contable</th></tr></thead><tbody><tr *ngFor="let l of selectedPurchaseLines()"><td>{{ productName(l.product_id) }}</td><td>{{ lotCode(l.lot_id) }}</td><td>{{ l.quantity }}</td><td>Q {{ l.unit_cost_with_tax }}</td><td>{{ l.physical_after }}</td><td>{{ l.accounting_after }}</td></tr></tbody></table></div>
        </div>
      </article>
    </section>


    <section class="salidas-workspace" *ngIf="tab() === 'salidas'">
      <article class="card pro-card">
        <div class="table-header"><div><h3>🚚 Nueva salida de bodega</h3><p class="muted">Descuenta existencia física y deja el documento pendiente de facturar. No descuenta contable.</p></div><button class="btn" type="button" (click)="resetExitForm()">➕ Nueva</button></div>
        <div class="alert-card compact"><strong>Regla:</strong> la salida entrega físicamente. La factura posterior solo afectará contable para evitar doble descuento físico.</div>
        <div class="form-grid">
          <label>Cliente<input [(ngModel)]="warehouseExit.client_name" placeholder="Consumidor final" /></label>
          <label>NIT<input [(ngModel)]="warehouseExit.client_tax_id" placeholder="CF" /></label>
          <label>Lote a entregar
            <select [(ngModel)]="exitLine.lot_id" (ngModelChange)="applyLotToExit()">
              <option [ngValue]="null">Seleccionar lote...</option>
              <option *ngFor="let l of sellableLots()" [ngValue]="l.id">{{ l.lot_code }} — {{ productName(l.product_id) }} — físico {{ l.available_physical }}</option>
            </select>
          </label>
          <label>Cantidad<input type="number" [(ngModel)]="exitLine.quantity" /></label>
          <label>Precio referencial<input type="number" [(ngModel)]="exitLine.unit_price_reference" /></label>
        </div>
        <label>Observaciones para la salida<textarea [(ngModel)]="warehouseExit.notes" placeholder="Entrega física pendiente de facturar..."></textarea></label>
        <div class="drawer-footer inline-footer"><button class="btn" type="button" (click)="resetExitForm()">Cancelar</button><button class="btn primary wide-auto" [disabled]="saving()" (click)="createWarehouseExit()">{{ saving() ? 'Guardando...' : '🚚 Confirmar salida' }}</button></div>
      </article>
      <article class="card table-card">
        <div class="table-header"><div><h3>📋 Salidas registradas</h3><p class="muted">Documentos operativos pendientes de facturar.</p></div><button class="btn" type="button" (click)="loadAll()">🔄 Actualizar</button></div>
        <div class="table-wrap pro-table"><table><thead><tr><th>Código</th><th>Cliente</th><th>Estado</th><th>Total referencial</th><th>Facturación</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let s of warehouseExits()"><td><strong>{{ s.exit_code }}</strong><br><small>{{ s.invoice_reference || 'Sin factura' }}</small></td><td>{{ s.client_name }}<br><small>{{ s.client_tax_id }}</small></td><td><span class="chip">{{ s.status }}</span></td><td>Q {{ s.total_reference || 0 }}</td><td>{{ s.is_invoiced ? 'Facturada' : 'Pendiente' }}</td><td><button class="btn small primary" type="button" [disabled]="s.is_invoiced || saving() || s.status === 'anulada'" (click)="invoiceExit(s)">🧾 Facturar</button> <button class="btn small danger" type="button" [disabled]="s.is_invoiced || s.status === 'anulada' || saving()" (click)="voidExit(s)">↩️ Anular</button></td></tr></tbody></table></div>
      </article>
      <aside class="card info-panel"><h3>🧭 Flujo</h3><p>Salida confirmada: físico baja, contable queda igual, Kardex registra movimiento físico y la salida queda pendiente de facturar.</p><div class="mini-help">Prueba con lote físico 2 / contable 2: salida 1 debe dejar físico 1 / contable 2.</div></aside>
    </section>


    <section class="facturas-workspace" *ngIf="tab() === 'facturas'">
      <article class="card pro-card">
        <div class="table-header"><div><h3>🧾 Factura directa</h3><p class="muted">Descuenta físico y contable en un solo flujo cuando no existe salida previa.</p></div><button class="btn" type="button" (click)="resetDirectInvoiceForm()">➕ Nueva</button></div>
        <div class="alert-card compact"><strong>Regla:</strong> factura directa = físico + contable. Factura desde salida = solo contable.</div>

        <div class="supplier-panel">
          <div class="supplier-list">
            <div class="section-title">Cliente existente</div>
            <input [(ngModel)]="customerSearch" placeholder="Buscar cliente por nombre, NIT, teléfono o correo..." />
            <div class="supplier-chips"><button class="chip-btn" type="button" *ngFor="let c of filteredCustomers().slice(0, 8)" (click)="selectCustomer(c)">👥 {{ c.name }} · {{ c.tax_id }}</button></div>
          </div>
          <div class="supplier-quick"><div class="section-title">Crear cliente rápido</div><div class="form-grid compact-grid"><label>Nombre<input [(ngModel)]="customer.name" /></label><label>NIT<input [(ngModel)]="customer.tax_id" /></label><label>Teléfono<input [(ngModel)]="customer.phone" /></label><label>Correo<input [(ngModel)]="customer.email" /></label></div><button class="btn small" type="button" (click)="createCustomer(true)">➕ Crear y usar cliente</button></div>
        </div>

        <div class="form-grid">
          <label>Cliente<input [(ngModel)]="directInvoice.client_name" placeholder="Consumidor final" /></label>
          <label>NIT<input [(ngModel)]="directInvoice.client_tax_id" placeholder="CF" /></label>
          <label>Lote a facturar
            <select [(ngModel)]="directInvoiceLine.lot_id" (ngModelChange)="applyLotToDirectInvoice()">
              <option [ngValue]="null">Seleccionar lote...</option>
              <option *ngFor="let l of sellableLots()" [ngValue]="l.id">{{ l.lot_code }} — {{ productName(l.product_id) }} — físico {{ l.available_physical }} / contable {{ l.available_accounting }}</option>
            </select>
          </label>
          <label>Cantidad<input type="number" [(ngModel)]="directInvoiceLine.quantity" /></label>
          <label>Precio unitario<input type="number" [(ngModel)]="directInvoiceLine.unit_price" /></label>
        </div>
        <div class="drawer-footer inline-footer">
          <button class="btn" type="button" (click)="addDirectInvoiceLine()">➕ Agregar línea</button>
          <button class="btn" type="button" (click)="resetDirectInvoiceForm()">Cancelar</button>
        </div>
        <div class="table-wrap pro-table invoice-lines" *ngIf="directInvoiceLines.length">
          <table>
            <thead><tr><th>Lote</th><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Total</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let line of directInvoiceLines; let i = index">
                <td>{{ lotCode(line.lot_id) }}</td>
                <td>{{ productNameByLot(line.lot_id) }}</td>
                <td>{{ line.quantity }}</td>
                <td>Q {{ line.unit_price || 0 }}</td>
                <td><strong>Q {{ invoiceLineTotal(line) }}</strong></td>
                <td><button class="btn small danger" type="button" (click)="removeDirectInvoiceLine(i)">✖</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="invoice-summary">
          <span>Subtotal</span><strong>Q {{ directInvoiceSubtotal() }}</strong>
          <span>IVA</span><strong>Incluido / según configuración</strong>
          <span>Total</span><strong>Q {{ directInvoiceSubtotal() }}</strong>
        </div>
        <label>Observaciones<textarea [(ngModel)]="directInvoice.notes" placeholder="Factura directa..."></textarea></label>
        <div class="drawer-footer inline-footer"><button class="btn" type="button" (click)="resetDirectInvoiceForm()">Cancelar</button><button class="btn primary wide-auto" [disabled]="saving() || !directInvoiceLines.length" (click)="createDirectInvoice()">{{ saving() ? 'Guardando...' : '🧾 Confirmar factura directa' }}</button></div>
      </article>
      <article class="card table-card ventas-consolidadas">
        <div class="table-header"><div><h3>🧾 Facturas registradas</h3><p class="muted">Directas y generadas desde salidas, con filtros, estados visuales e impresión mejorada.</p></div><button class="btn" type="button" (click)="loadAll()">🔄 Actualizar</button></div>
        <div class="invoice-kpis">
          <button type="button" class="invoice-kpi" (click)="invoiceStatusFilter='' ; invoiceSourceFilter=''">🧾 <strong>{{ salesInvoices().length }}</strong><small>Total</small></button>
          <button type="button" class="invoice-kpi ok" (click)="invoiceStatusFilter='emitida'">✅ <strong>{{ invoiceCountByStatus('emitida') }}</strong><small>Emitidas</small></button>
          <button type="button" class="invoice-kpi danger" (click)="invoiceStatusFilter='anulada'">↩️ <strong>{{ invoiceCountByStatus('anulada') }}</strong><small>Anuladas</small></button>
          <button type="button" class="invoice-kpi" (click)="invoiceSourceFilter='directa'">⚡ <strong>{{ directInvoiceCount() }}</strong><small>Directas</small></button>
          <button type="button" class="invoice-kpi" (click)="invoiceSourceFilter='salida'">🚚 <strong>{{ exitInvoiceCount() }}</strong><small>Desde salida</small></button>
          <button type="button" class="invoice-kpi money">💰 <strong>Q {{ invoiceTotalVisible() }}</strong><small>Total visible</small></button>
        </div>
        <div class="filters-row">
          <input [(ngModel)]="invoiceSearch" placeholder="Buscar factura, cliente, NIT, observaciones..." />
          <select [(ngModel)]="invoiceStatusFilter"><option value="">Todos los estados</option><option value="emitida">Emitidas</option><option value="anulada">Anuladas</option></select>
          <select [(ngModel)]="invoiceSourceFilter"><option value="">Todos los orígenes</option><option value="directa">Factura directa</option><option value="salida">Desde salida</option></select>
          <button class="btn small" type="button" (click)="clearInvoiceFilters()">🧹 Limpiar</button>
        </div>
        <div class="table-wrap pro-table"><table><thead><tr><th>Factura</th><th>Origen</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let f of filteredSalesInvoices()" [class.selected]="selectedInvoice()?.id === f.id" (click)="selectInvoice(f)"><td><strong>{{ f.invoice_code }}</strong><br><small>{{ f.notes || 'Sin observaciones' }}</small></td><td><span class="chip soft">{{ f.source_exit_id ? exitCode(f.source_exit_id) : 'Directa' }}</span></td><td>{{ f.client_name }}<br><small>{{ f.client_tax_id }}</small></td><td><span class="status-pill" [class.status-void]="f.status === 'anulada'" [class.status-ok]="f.status !== 'anulada'">{{ f.status }}</span></td><td><strong>Q {{ f.total || 0 }}</strong></td><td class="row-actions" (click)="$event.stopPropagation()"><button class="btn small" type="button" (click)="selectInvoice(f)">👁️ Ver</button> <button class="btn small" type="button" (click)="printInvoice(f)">🖨️ Imprimir</button> <button class="btn small danger" type="button" [disabled]="f.status === 'anulada' || saving()" (click)="voidInvoice(f)">↩️ Anular</button></td></tr></tbody></table></div>
      </article>

      <aside class="card info-panel invoice-detail">
        <h3>📄 Detalle de factura</h3>
        <ng-container *ngIf="selectedInvoice(); else noInvoiceSelected">
          <div class="context-avatar">🧾</div>
          <h4>{{ selectedInvoice()?.invoice_code }}</h4>
          <p>{{ selectedInvoice()?.client_name }} · {{ selectedInvoice()?.client_tax_id }}</p>
          <div class="context-chips"><span class="chip">{{ selectedInvoice()?.status }}</span><span class="chip soft">{{ selectedInvoice()?.source_exit_id ? 'Desde salida' : 'Directa' }}</span></div>
          <div class="info-list"><span>Subtotal</span><strong>Q {{ selectedInvoice()?.subtotal || 0 }}</strong><span>IVA</span><strong>Q {{ selectedInvoice()?.tax_total || 0 }}</strong><span>Total</span><strong>Q {{ selectedInvoice()?.total || 0 }}</strong><span>Origen</span><strong>{{ selectedInvoice()?.source_exit_id ? exitCode(selectedInvoice()?.source_exit_id) : 'Factura directa' }}</strong></div>
          <div class="table-wrap mini-table" *ngIf="selectedInvoiceLines().length"><table><thead><tr><th>Lote</th><th>Cant.</th><th>Total</th></tr></thead><tbody><tr *ngFor="let line of selectedInvoiceLines()"><td>{{ lotCode(line.lot_id) }}<br><small>{{ productName(line.product_id) }}</small></td><td>{{ line.quantity }}</td><td>Q {{ line.total_line }}</td></tr></tbody></table></div>
          <div class="quick-actions"><button class="btn small" type="button" (click)="printInvoice(selectedInvoice())">🖨️ Imprimir</button><button class="btn small danger" type="button" [disabled]="selectedInvoice()?.status === 'anulada' || saving()" (click)="voidInvoice(selectedInvoice())">↩️ Anular</button></div>
        </ng-container>
        <ng-template #noInvoiceSelected><p class="muted">Selecciona una factura para ver líneas, origen, totales y acciones rápidas sin salir del módulo.</p></ng-template>
      </aside>
    </section>

    <section class="catalog-workspace" *ngIf="tab() === 'catalogos'">
      <article class="card catalog-hero">
        <div>
          <h3>🗂️ Catálogos inteligentes + automatizaciones</h3>
          <p class="muted">Un solo centro para administrar categorías, marcas, series motor, características y bodegas. Estos datos alimentan productos, lotes, POS, compras, ventas y futuras integraciones.</p>
        </div>
        <div class="brief-actions">
          <button class="btn primary wide-auto" type="button" (click)="seedDefaultCatalogs()">✨ Cargar catálogos base</button>
          <button class="btn wide-auto" type="button" (click)="exportCatalogsCsv()">📤 Exportar catálogos</button>
          <button class="btn wide-auto" type="button" (click)="showAutomationRules()">🤖 Reglas activas</button>
        </div>
      </article>

      <section class="metric-grid pro-metrics">
        <article class="metric"><span>📂 Categorías</span><strong>{{ catalogOverview()?.categories || categories().length }}</strong><small>{{ catalogOverview()?.categories_with_rules || 0 }} con reglas</small></article>
        <article class="metric"><span>🚘 Marcas</span><strong>{{ catalogOverview()?.brands || brands().length }}</strong></article>
        <article class="metric"><span>⚙️ Series motor</span><strong>{{ catalogOverview()?.engine_series || engineSeries().length }}</strong><small>{{ catalogOverview()?.automation_ready_series || 0 }} con prefijo SKU</small></article>
        <article class="metric"><span>🏷️ Características</span><strong>{{ catalogOverview()?.characteristics || characteristics().length }}</strong></article>
        <article class="metric"><span>🚙 Modelos/Líneas</span><strong>{{ catalogOverview()?.vehicle_models || vehicleModels().length }}</strong></article>
        <article class="metric"><span>🏬 Bodegas</span><strong>{{ catalogOverview()?.warehouses || warehouses().length }}</strong></article>
        <article class="metric warn"><span>🗑️ Papelera</span><strong>{{ catalogOverview()?.deleted_items || catalogTrash().length }}</strong><small>catálogos</small></article>
      </section>

      <div class="catalog-layout">
        <aside class="filter-panel card">
          <h3>🔎 Catálogos</h3>
          <label>Buscar<input [(ngModel)]="catalogSearch" placeholder="Nombre, código, prefijo..." /></label>
          <button class="chip-button" [class.active]="selectedCatalogType === 'categories'" (click)="selectedCatalogType='categories'">📂 Categorías</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'brands'" (click)="selectedCatalogType='brands'">🚘 Marcas</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'vehicleModels'" (click)="selectedCatalogType='vehicleModels'">🚙 Modelos/Líneas</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'engineSeries'" (click)="selectedCatalogType='engineSeries'">⚙️ Series motor</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'characteristics'" (click)="selectedCatalogType='characteristics'">🏷️ Características</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'warehouses'" (click)="selectedCatalogType='warehouses'">🏬 Bodegas</button>
          <button class="chip-button" [class.active]="selectedCatalogType === 'trash'" (click)="selectedCatalogType='trash'; loadCatalogTrash()">🗑️ Papelera</button>
          <div class="mini-help">💡 Las reglas de catálogo se aplican al producto desde el Drawer: categoría y serie motor pueden sugerir datos automáticamente.</div>
        </aside>

        <article class="card catalog-table-card">
          <div class="table-header"><div><h3>📋 Registros</h3><p class="muted">{{ visibleCatalogItems().length }} registro(s) visibles</p></div></div>
          <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Nombre/Código</th><th>Reglas</th><th>Estado</th><th>Acción</th></tr></thead><tbody><tr *ngFor="let item of visibleCatalogItems()"><td>{{ item.kindLabel }}</td><td><strong>{{ item.title }}</strong><br><small>{{ item.subtitle }}</small></td><td>{{ item.rules || '—' }}</td><td><span class="chip" [class.soft]="item.deleted">{{ item.deleted ? 'Papelera' : 'Activo' }}</span></td><td><button class="btn small" *ngIf="!item.deleted && item.catalogType" (click)="deleteCatalogItem(item)">🗑️</button><button class="btn small" *ngIf="item.deleted" (click)="restoreCatalogItem(item)">♻️</button></td></tr></tbody></table></div>
        </article>

        <aside class="card catalog-forms">
          <h3>➕ Crear rápido</h3>
          <details open><summary>📂 Categoría</summary><label>Nombre<input [(ngModel)]="category.name" /></label><label>Tipo<select [(ngModel)]="category.category_kind"><option value="principal">Principal</option><option value="producto">Producto</option><option value="general">General</option></select></label><label>Prefijo SKU<input [(ngModel)]="category.sku_prefix" /></label><label class="check"><input type="checkbox" [(ngModel)]="category.requires_engine_series" /> Requiere serie motor</label><label class="check"><input type="checkbox" [(ngModel)]="category.handles_inventory" /> Maneja inventario</label><button class="btn primary" (click)="createCategory()">Guardar categoría</button></details>
          <details><summary>🚘 Marca</summary><label>Nombre<input [(ngModel)]="brand.name" /></label><button class="btn primary" (click)="createBrand()">Guardar marca</button></details>
          <details><summary>🚙 Modelo/Línea</summary><label>Marca<select [(ngModel)]="vehicleModel.brand_id"><option [ngValue]="null">Seleccionar...</option><option *ngFor="let b of brands()" [ngValue]="b.id">{{ b.name }}</option></select></label><label>Modelo/Línea<input [(ngModel)]="vehicleModel.name" placeholder="Santa Fe, L200, Hilux..." /></label><button class="btn primary" (click)="createVehicleModel()">Guardar modelo/línea</button></details>
          <details><summary>⚙️ Serie motor</summary><div class="form-grid"><label>Código<input [(ngModel)]="series.code" /></label><label>Nombre<input [(ngModel)]="series.name" /></label><label>Marca<input [(ngModel)]="series.brand_name" /></label><label>Combustible<input [(ngModel)]="series.fuel_type" /></label><label>CC<input [(ngModel)]="series.displacement_cc" /></label><label>Cilindros<input [(ngModel)]="series.cylinders" /></label><label>Prefijo SKU<input [(ngModel)]="series.sku_prefix" /></label></div><label>Equivalentes<textarea [(ngModel)]="series.equivalent_series" placeholder="D4EA-R, D4EA..." ></textarea></label><button class="btn primary" (click)="createSeries()">Guardar serie</button></details>
          <details><summary>🏷️ Característica</summary><label>Nombre<input [(ngModel)]="characteristic.name" /></label><label>Descripción<textarea [(ngModel)]="characteristic.description"></textarea></label><button class="btn primary" (click)="createCharacteristic()">Guardar característica</button></details>
          <details><summary>🏬 Bodega</summary><label>Código<input [(ngModel)]="warehouse.code" /></label><label>Nombre<input [(ngModel)]="warehouse.name" /></label><label>Ubicación<input [(ngModel)]="warehouse.location" /></label><button class="btn primary" (click)="createWarehouse()">Guardar bodega</button></details>
          <details><summary>📥 Importar CSV</summary><label>Tipo<select [(ngModel)]="importCatalogType"><option value="categories">Categorías</option><option value="brands">Marcas</option><option value="engine-series">Series motor</option><option value="characteristics">Características</option></select></label><label>CSV<textarea [(ngModel)]="catalogImportText" placeholder="name,sku_prefix\nCulata,cul"></textarea></label><button class="btn primary" (click)="importCatalogCsv()">Importar catálogo</button><button class="btn" (click)="loadCatalogTrash()">Actualizar papelera</button></details>
        </aside>
      </div>
    </section>

    <section class="pos-workspace" *ngIf="tab() === 'pos'">
      <article class="pos-products card">
        <div class="table-header">
          <div>
            <h3>🛒 POS Pro Consolidado</h3>
            <p class="muted">Venta rápida visual con categorías, carrito protegido, descuentos, pago recibido, vuelto y ticket profesional.</p>
          </div>
          <button class="btn" type="button" (click)="resetPOS()">🧹 Limpiar venta</button>
        </div>
        <div class="pos-search-row pro-pos-search">
          <input [(ngModel)]="posSearch" placeholder="Buscar producto, lote, motor, serie o ubicación..." />
          <select [(ngModel)]="posCategoryFilter">
            <option value="">Todas las categorías</option>
            <option value="motor">Motores</option>
            <option value="repuesto">Repuestos</option>
            <option value="servicio">Servicios</option>
            <option value="kit">Kits</option>
            <option value="accesorio">Accesorios</option>
          </select>
          <button class="btn wide-auto" type="button" (click)="loadAll()">🔄 Actualizar existencias</button>
        </div>
        <div class="pos-quick-filters pos-category-buttons">
          <button type="button" class="chip-button" [class.active]="posQuickFilter === 'todos'" (click)="posQuickFilter='todos'">✨ Todos</button>
          <button type="button" class="chip-button big" [class.active]="posQuickFilter === 'motores'" (click)="posQuickFilter='motores'">🚗 Motores</button>
          <button type="button" class="chip-button big" [class.active]="posQuickFilter === 'repuestos'" (click)="posQuickFilter='repuestos'">🔧 Repuestos</button>
          <button type="button" class="chip-button" [class.active]="posQuickFilter === 'bajo'" (click)="posQuickFilter='bajo'">⚠️ Bajo stock</button>
          <button type="button" class="chip-button" [class.active]="posQuickFilter === 'fuera_contable'" (click)="posQuickFilter='fuera_contable'">📚 Fuera contable</button>
        </div>
        <div class="pos-mini-kpis">
          <span>Productos visibles <strong>{{ filteredPOSLots().length }}</strong></span>
          <span>En carrito <strong>{{ posCart.length }}</strong></span>
          <span>Total <strong>Q {{ posTotal() }}</strong></span>
        </div>
        <div class="pos-grid">
          <button class="pos-card" type="button" *ngFor="let l of filteredPOSLots().slice(0, 60)" (click)="addPOSLot(l)">
            <div class="pos-img">📦</div>
            <div class="pos-info">
              <strong>{{ productName(l.product_id) }}</strong>
              <small>{{ l.lot_code }} · {{ l.location || 'Sin ubicación' }}</small>
              <span class="status-pill status-ok">Disponible {{ l.available_physical }}</span>
            </div>
            <div class="pos-price">Q {{ l.special_lot_price || l.sale_price || 0 }}</div>
          </button>
        </div>
      </article>

      <aside class="pos-cart card">
        <h3>🧾 Carrito</h3>
        <label>Cliente
          <select [(ngModel)]="posInvoice.client_name" (ngModelChange)="applyPOSCustomerByName()">
            <option value="Consumidor final">Consumidor final</option>
            <option *ngFor="let c of customers()" [value]="c.name">{{ c.name }} · {{ c.tax_id || 'CF' }}</option>
          </select>
        </label>
        <div class="pos-client-mini">
          <input [(ngModel)]="posInvoice.client_name" placeholder="Nombre del cliente" />
          <input [(ngModel)]="posInvoice.client_tax_id" placeholder="NIT / CF" />
        </div>
        <details class="quick-create-box">
          <summary>➕ Crear cliente rápido</summary>
          <div class="quick-create-grid">
            <input [(ngModel)]="posQuickCustomer.name" placeholder="Nombre" />
            <input [(ngModel)]="posQuickCustomer.tax_id" placeholder="NIT / CF" />
            <input [(ngModel)]="posQuickCustomer.phone" placeholder="Teléfono" />
            <button class="btn small primary" type="button" (click)="createPOSQuickCustomer()">Guardar y usar</button>
          </div>
        </details>
        <div class="pos-cart-lines" *ngIf="posCart.length; else emptyPOS">
          <div class="cart-line pro-cart-line" *ngFor="let line of posCart; let i = index">
            <div><strong>{{ productNameByLot(line.lot_id) }}</strong><small>{{ lotCode(line.lot_id) }}</small></div>
            <label>Cant.<input type="number" min="1" [(ngModel)]="line.quantity" (ngModelChange)="validatePOSLine(line)" /></label>
            <label>Precio<input type="number" min="0" [(ngModel)]="line.unit_price" /></label>
            <label>Desc.%<input type="number" min="0" max="100" [(ngModel)]="line.discount_percent" /></label>
            <strong class="line-total">Q {{ posLineTotal(line) }}</strong>
            <button class="btn small danger" (click)="removePOSLine(i)">✕</button>
          </div>
        </div>
        <ng-template #emptyPOS><p class="muted">Selecciona productos/lotes disponibles para agregarlos al carrito.</p></ng-template>
        <div class="payment-grid">
          <label>Método de pago
            <select [(ngModel)]="posPaymentMethod">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>
          <label>Descuento general %<input type="number" min="0" max="100" [(ngModel)]="posGlobalDiscountPercent" /></label>
          <label>Recibido Q<input type="number" min="0" [(ngModel)]="posCashReceived" /></label>
          <label>Vuelto Q<input readonly [value]="posChange()" /></label>
        </div>
        <div class="invoice-summary pos-total">
          <span>Líneas</span><strong>{{ posCart.length }}</strong>
          <span>Subtotal</span><strong>Q {{ posSubtotal() }}</strong>
          <span>Descuento</span><strong>Q {{ posDiscountTotal() }}</strong>
          <span>Total</span><strong>Q {{ posTotal() }}</strong>
          <span>Recibido</span><strong>Q {{ posCashReceived || 0 }}</strong>
          <span>Vuelto</span><strong>Q {{ posChange() }}</strong>
        </div>
        <label>Notas de venta<textarea [(ngModel)]="posInvoice.notes" placeholder="Observaciones para la factura..."></textarea></label>
        <button class="btn primary pos-pay" [disabled]="saving() || !posCart.length" (click)="chargePOS()">{{ saving() ? 'Cobrando...' : '💳 Cobrar y facturar' }}</button>
        <div class="pos-secondary-actions">
          <button class="btn wide-auto" [disabled]="!posCart.length" (click)="savePendingPOS()">💾 Guardar pendiente</button>
          <button class="btn wide-auto" [disabled]="!pendingPOSCarts.length" (click)="loadLastPendingPOS()">📂 Cargar pendiente</button>
          <button class="btn wide-auto" [disabled]="!posCart.length" (click)="printPOSTicketPreview()">🖨️ Vista ticket</button>
        </div>
        <div class="pending-sales" *ngIf="pendingPOSCarts.length">
          <strong>Ventas pendientes</strong>
          <button type="button" *ngFor="let pending of pendingPOSCarts; let i = index" (click)="loadPendingPOS(i)">📌 {{ pending.client_name }} · Q {{ pending.total }}</button>
        </div>
        <div class="mini-help">🛡️ Anti doble clic activo. El botón se bloquea mientras se confirma la venta.</div>
      </aside>
    </section>

    <section class="card" *ngIf="tab() === 'existencias'"><h3>📊 Reglas de existencias físico/contable</h3><div class="rules-grid"><div><strong>Entrada / lote inicial</strong><p>Crea existencia física y, si el lote está dentro de inventario contable, también existencia contable.</p></div><div><strong>Salida de bodega</strong><p>Descuenta físico y deja cantidad pendiente de facturar. No descuenta contable por defecto.</p></div><div><strong>Factura desde salida</strong><p>Descuenta contable sin volver a descontar físico. Evita doble descuento.</p></div><div><strong>Factura directa</strong><p>Si no viene de salida, descuenta físico y contable en el mismo flujo.</p></div><div><strong>Lote fuera contable</strong><p>Puede venderse con alerta, suma al control operativo físico, pero no a valorización contable.</p></div><div><strong>Desarme</strong><p>El lote padre se controla con estado de desarme y los lotes hijos conservarán trazabilidad padre-hijo.</p></div></div></section>
    <section class="card" *ngIf="tab() === 'kardex'"><h3>📒 Kardex</h3><div class="table-wrap"><table><thead><tr><th>ID</th><th>Tipo</th><th>Referencia</th><th>Físico</th><th>Contable</th><th>Cantidad</th><th>Notas</th></tr></thead><tbody><tr *ngFor="let k of kardex()"><td>{{ k.id }}</td><td>{{ k.movement_type }}</td><td>{{ k.reference_type }}</td><td>{{ k.physical_balance_after }}</td><td>{{ k.accounting_balance_after }}</td><td>{{ k.quantity }}</td><td>{{ k.notes }}</td></tr></tbody></table></div></section>

    <div class="drawer-backdrop" *ngIf="drawerOpen()" (click)="closeDrawer()"></div>
    <aside class="product-drawer" *ngIf="drawerOpen()">
      <div class="drawer-head"><div><h2>{{ editingProductId() ? '✏️ Editar producto' : '➕ Nuevo producto' }}</h2><p>Formulario por secciones, rápido y sin cambiar de pantalla.</p></div><button class="btn icon" (click)="closeDrawer()">✕</button></div>
      <div class="drawer-tabs"><button [class.active]="drawerTab() === 'general'" (click)="drawerTab.set('general')">General</button><button [class.active]="drawerTab() === 'auto'" (click)="drawerTab.set('auto')">Automotriz</button><button [class.active]="drawerTab() === 'precio'" (click)="drawerTab.set('precio')">Precios</button><button [class.active]="drawerTab() === 'notas'" (click)="drawerTab.set('notas')">Notas</button></div>
      <div class="drawer-body" *ngIf="drawerTab() === 'general'"><div class="section-title">Datos principales</div><div class="form-grid"><label>SKU *<input [(ngModel)]="product.sku" /></label><label>Nombre *<input [(ngModel)]="product.name" /></label><label>Nombre corto<input [(ngModel)]="product.short_name" /></label><label>Tipo<select [(ngModel)]="product.product_type"><option value="repuesto">Repuesto</option><option value="motor">Motor</option><option value="servicio">Servicio</option><option value="kit">Kit</option><option value="accesorio">Accesorio</option></select></label><label>Modo inventario<select [(ngModel)]="product.inventory_mode"><option value="inventariable">Dentro de inventario</option><option value="fuera_inventario">Fuera de inventario</option><option value="servicio">Servicio/no inventariable</option></select></label><label>Condición<select [(ngModel)]="product.condition"><option value="nuevo">Nuevo</option><option value="usado">Usado</option><option value="reconstruido">Reconstruido</option><option value="importado">Importado</option></select></label><label>Categoría principal<select [(ngModel)]="product.main_category_id" (ngModelChange)="applyCategoryDefaults(product.main_category_id)"><option [ngValue]="null">Seleccionar...</option><option *ngFor="let c of categories()" [ngValue]="c.id">{{ c.name }}</option></select></label><label>Categoría producto<select [(ngModel)]="product.product_category_id" (ngModelChange)="applyCategoryDefaults(product.product_category_id)"><option [ngValue]="null">Seleccionar...</option><option *ngFor="let c of categories()" [ngValue]="c.id">{{ c.name }}</option></select></label><label>Características/chips<input [(ngModel)]="product.characteristic_tags" placeholder="Turbo, Original, Completo" /></label><label>Unidad<input [(ngModel)]="product.unit" /></label></div></div>
      <div class="drawer-body" *ngIf="drawerTab() === 'auto'"><div class="section-title">Datos automotrices</div><div class="form-grid"><label>Marca<select [(ngModel)]="product.brand_id"><option [ngValue]="null">Seleccionar...</option><option *ngFor="let b of brands()" [ngValue]="b.id">{{ b.name }}</option></select></label><label>Serie motor<select [(ngModel)]="product.engine_series_id" (ngModelChange)="applySeriesDefaults()"><option [ngValue]="null">Seleccionar...</option><option *ngFor="let s of engineSeries()" [ngValue]="s.id">{{ s.code }} — {{ s.name }}</option></select></label><label>Marca compatible<input [(ngModel)]="product.compatible_brand" /></label><label>Línea/modelo compatible<select [(ngModel)]="product.compatible_model"><option value="">Seleccionar o escribir manual...</option><option *ngFor="let m of vehicleModels()" [value]="m.name">{{ modelBrandName(m.brand_id) }} — {{ m.name }}</option></select></label><label>Año desde<input [(ngModel)]="product.year_from" /></label><label>Año hasta<input [(ngModel)]="product.year_to" /></label><label>Combustible<input [(ngModel)]="product.fuel_type" /></label><label>CC<input [(ngModel)]="product.displacement_cc" /></label><label>Cilindros<input [(ngModel)]="product.cylinders" /></label><label>OEM principal<input [(ngModel)]="product.oem_primary" /></label><label>OEM compatibles<textarea [(ngModel)]="product.oem_compatible_codes"></textarea></label><label>Series compatibles<textarea [(ngModel)]="product.compatible_engine_series_tags"></textarea></label></div><div class="mini-help">⚙️ La serie motor autocompleta combustible, CC, cilindros, equivalencias y prefijo SKU cuando existan.</div></div>
      <div class="drawer-body" *ngIf="drawerTab() === 'precio'"><div class="section-title">Precios comerciales</div><div class="price-tools"><label class="check"><input type="checkbox" [(ngModel)]="product.prices_linked" /> 🔗 Precios vinculados</label><span class="chip">GTQ</span><span class="chip">IVA 12%</span><span class="chip">Oferta {{ product.offer_discount_percent }}%</span></div><div class="form-grid"><label>Precio venta<input type="number" [(ngModel)]="product.price_sale" (ngModelChange)="priceSaleChanged()" /></label><label>% descuento oferta<input type="number" [(ngModel)]="product.offer_discount_percent" (ngModelChange)="priceSaleChanged()" /></label><label>Precio oferta<input type="number" [(ngModel)]="product.price_offer" (ngModelChange)="priceOfferChanged()" /></label><label>Precio mayorista<input type="number" [(ngModel)]="product.price_wholesale" /></label><label>Precio mínimo autorizado<input type="number" [(ngModel)]="product.price_min_authorized" /></label><label>Stock mínimo<input type="number" [(ngModel)]="product.stock_min" /></label></div></div>
      <div class="drawer-body" *ngIf="drawerTab() === 'notas'"><div class="section-title">Descripción y notas</div><label>Descripción<textarea [(ngModel)]="product.description"></textarea></label><label>Comentarios internos / notas<textarea [(ngModel)]="product.internal_notes"></textarea></label><label>Notas para venta<textarea [(ngModel)]="product.sale_notes"></textarea></label></div>
      <div class="drawer-footer"><button class="btn" type="button" (click)="closeDrawer()">Cancelar</button><button class="btn primary wide-auto" type="button" [disabled]="saving()" (click)="saveProduct()">{{ saving() ? 'Guardando...' : '💾 Guardar producto' }}</button></div>
    </aside>
  `
})
export class InventoryComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  tab = signal<'productos' | 'papelera' | 'lotes' | 'compras' | 'clientes' | 'existencias' | 'salidas' | 'facturas' | 'pos' | 'catalogos' | 'kardex'>('productos');
  drawerOpen = signal(false);
  drawerTab = signal<'general' | 'auto' | 'precio' | 'notas'>('general');
  loading = signal(false);
  saving = signal(false);
  toast = signal('');
  alert = signal<any | null>(null);
  private alertAction: (() => void) | null = null;
  editingProductId = signal<number | null>(null);
  selectedProduct = signal<any | null>(null);
  selectedLot = signal<any | null>(null);
  selectedPurchase = signal<any | null>(null);
  selectedPurchaseLines = signal<any[]>([]);
  selectedInvoice = signal<any | null>(null);
  selectedInvoiceLines = signal<any[]>([]);
  editingPurchaseId = signal<number | null>(null);
  editingLotId = signal<number | null>(null);
  summary = signal<Summary | null>(null);
  catalogOverview = signal<any | null>(null);
  categories = signal<any[]>([]); brands = signal<any[]>([]); vehicleModels = signal<any[]>([]); characteristics = signal<any[]>([]); engineSeries = signal<any[]>([]); warehouses = signal<any[]>([]); catalogTrash = signal<any[]>([]); products = signal<any[]>([]); deletedProducts = signal<any[]>([]); lots = signal<any[]>([]); kardex = signal<any[]>([]); warehouseExits = signal<any[]>([]); salesInvoices = signal<any[]>([]); purchases = signal<any[]>([]); suppliers = signal<any[]>([]); customers = signal<any[]>([]);
  productSearch = ''; catalogSearch = ''; selectedCatalogType = 'categories'; importCatalogType = 'categories'; catalogImportText = 'name,sku_prefix\nCulata,cul'; lotSearch = ''; lotStatusFilter = ''; supplierSearch = ''; customerSearch = ''; invoiceSearch = ''; posSearch = ''; invoiceStatusFilter = ''; invoiceSourceFilter = ''; filterType = ''; filterInventory = ''; filterCondition = '';
  category: any = { name: '', description: '', category_kind: 'producto', sku_prefix: '', requires_engine_series: false, handles_inventory: true };
  brand: any = { name: '' }; vehicleModel: any = { brand_id: null, name: '' }; characteristic: any = { name: '', description: '' }; series: any = { code: '', name: '', brand_name: '', fuel_type: '', displacement_cc: '', cylinders: '', equivalent_series: '', sku_prefix: '' }; warehouse: any = { code: '', name: '', location: '', is_default: false }; supplier: any = { name: '', tax_id: 'CF', contact_name: '', phone: '', email: '', address: '', notes: '' }; customer: any = this.newCustomer();
  product: any = this.newProduct(); lot: any = this.newLot(); warehouseExit: any = this.newWarehouseExit(); exitLine: any = this.newExitLine(); directInvoice: any = this.newDirectInvoice(); directInvoiceLine: any = this.newDirectInvoiceLine(); directInvoiceLines: any[] = []; posInvoice: any = this.newDirectInvoice(); posLine: any = this.newDirectInvoiceLine(); posCart: any[] = []; posQuickFilter = 'todos'; posCategoryFilter = ''; posPaymentMethod = 'efectivo'; posGlobalDiscountPercent = 0; posCashReceived = 0; posQuickCustomer: any = { name: '', tax_id: 'CF', phone: '' }; pendingPOSCarts: any[] = this.readPendingPOS(); purchase: any = this.newPurchase(); purchaseLine: any = this.newPurchaseLine(); purchaseLines: any[] = [];

  filteredProducts = computed(() => {
    const q = this.productSearch.toLowerCase().trim();
    return this.products().filter(p => {
      const text = `${p.sku} ${p.name} ${p.oem_primary} ${p.characteristic_tags} ${p.fuel_type} ${p.displacement_cc}`.toLowerCase();
      return (!q || text.includes(q)) && (!this.filterType || p.product_type === this.filterType) && (!this.filterInventory || p.inventory_mode === this.filterInventory) && (!this.filterCondition || p.condition === this.filterCondition);
    });
  });

  filteredLots = computed(() => {
    const q = this.lotSearch.toLowerCase().trim();
    return this.lots().filter(l => {
      const text = `${l.lot_code} ${this.productName(l.product_id)} ${l.engine_number} ${l.serial_number} ${l.location} ${l.inventory_status}`.toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesStatus = !this.lotStatusFilter
        || (this.lotStatusFilter === 'bajo_stock' && Number(l.available_physical || 0) <= 1)
        || (this.lotStatusFilter === 'bloqueado' && l.is_blocked)
        || (this.lotStatusFilter === 'fuera_contable' && l.is_out_of_accounting_inventory)
        || (this.lotStatusFilter === 'desarmable' && l.is_disassemblable);
      return matchesText && matchesStatus;
    });
  });

  sellableLots = computed(() => this.lots().filter(l => !l.is_blocked && l.is_sellable && Number(l.available_physical || 0) > 0));

  filteredPOSLots = computed(() => {
    const q = this.posSearch.toLowerCase().trim();
    return this.sellableLots().filter(l => {
      const p = this.products().find(x => Number(x.id) === Number(l.product_id));
      const text = `${l.lot_code} ${this.productName(l.product_id)} ${l.engine_number} ${l.serial_number} ${l.location} ${p?.product_type || ''}`.toLowerCase();
      const matchesText = !q || text.includes(q);
      const matchesCategory = !this.posCategoryFilter || p?.product_type === this.posCategoryFilter;
      const matchesQuick = this.posQuickFilter === 'todos'
        || (this.posQuickFilter === 'motores' && p?.product_type === 'motor')
        || (this.posQuickFilter === 'repuestos' && p?.product_type === 'repuesto')
        || (this.posQuickFilter === 'bajo' && Number(l.available_physical || 0) <= 1)
        || (this.posQuickFilter === 'fuera_contable' && l.is_out_of_accounting_inventory);
      return matchesText && matchesCategory && matchesQuick;
    });
  });


  filteredSuppliers = computed(() => {
    const q = this.supplierSearch.toLowerCase().trim();
    return this.suppliers().filter(s => !q || `${s.name} ${s.tax_id} ${s.phone} ${s.email}`.toLowerCase().includes(q));
  });

  constructor() { this.loadAll(); }

  filteredCustomers = computed(() => {
    const q = this.customerSearch.toLowerCase().trim();
    return this.customers().filter(c => !q || `${c.name} ${c.tax_id} ${c.phone} ${c.email}`.toLowerCase().includes(q));
  });

  filteredSalesInvoices = computed(() => {
    const q = this.invoiceSearch.toLowerCase().trim();
    return this.salesInvoices().filter(f => {
      const source = f.source_exit_id ? 'salida' : 'directa';
      const text = `${f.invoice_code} ${f.client_name} ${f.client_tax_id} ${f.notes || ''} ${source}`.toLowerCase();
      return (!q || text.includes(q))
        && (!this.invoiceStatusFilter || f.status === this.invoiceStatusFilter)
        && (!this.invoiceSourceFilter || source === this.invoiceSourceFilter);
    });
  });

  clearInvoiceFilters(): void { this.invoiceSearch = ''; this.invoiceStatusFilter = ''; this.invoiceSourceFilter = ''; }
  invoiceCountByStatus(status: string): number { return this.salesInvoices().filter(f => f.status === status).length; }
  directInvoiceCount(): number { return this.salesInvoices().filter(f => !f.source_exit_id).length; }
  exitInvoiceCount(): number { return this.salesInvoices().filter(f => !!f.source_exit_id).length; }
  invoiceTotalVisible(): number { return Number(this.filteredSalesInvoices().reduce((acc, f) => acc + Number(f.total || 0), 0).toFixed(2)); }
  newCustomer(): any { return { name: 'Consumidor final', tax_id: 'CF', contact_name: '', phone: '', email: '', address: '', price_type: 'normal', discount_percent: 0, seller_name: '', notes: '' }; }

  newPurchase(): any { return { supplier_name: 'Proveedor general', supplier_tax_id: 'CF', warehouse_id: this.defaultWarehouseId(), document_reference: '', status: 'borrador', notes: '', internal_notes: '', lines: [] }; }
  newPurchaseLine(): any { return { product_id: null, lot_code: '', quantity: 1, unit_cost_with_tax: 0, is_out_of_accounting_inventory: false, notes: '' }; }
  newWarehouseExit(): any { return { client_name: 'Consumidor final', client_tax_id: 'CF', notes: '', internal_notes: '', lines: [] }; }
  newExitLine(): any { return { lot_id: null, quantity: 1, unit_price_reference: 0, notes: '' }; }
  newDirectInvoice(): any { return { client_name: 'Consumidor final', client_tax_id: 'CF', notes: '', internal_notes: '', lines: [] }; }
  newDirectInvoiceLine(): any { return { lot_id: null, quantity: 1, unit_price: 0, notes: '' }; }
  newProduct(): any { return { sku: '', name: '', short_name: '', product_type: 'repuesto', inventory_mode: 'inventariable', condition: 'nuevo', main_category_id: null, product_category_id: null, category_id: null, additional_category_ids: '', characteristic_tags: '', brand_id: null, engine_series_id: null, unit: 'unidad', compatible_brand: '', compatible_model: '', year_from: '', year_to: '', fuel_type: '', displacement_cc: '', cylinders: '', oem_primary: '', oem_compatible_codes: '', compatible_engine_series_tags: '', price_sale: 0, offer_discount_percent: 10, price_offer: 0, price_wholesale: 0, price_min_authorized: 0, prices_linked: true, stock_min: 1, currency: 'GTQ', tax_rate: 12, description: '', internal_notes: '', sale_notes: '' }; }
  newLot(): any { return { product_id: null, warehouse_id: this.defaultWarehouseId(), lot_code: '', barcode: '', qr_code: '', engine_number: '', serial_number: '', location: '', quantity_initial: 1, physical_initial_qty: 1, accounting_initial_qty: 1, unit_cost: 0, cost_includes_tax: true, sale_price: 0, special_lot_price: 0, is_out_of_accounting_inventory: false, is_sellable: true, is_blocked: false, inventory_status: 'disponible', is_disassemblable: false, disassembly_status: 'no_aplica', parent_lot_id: null, notes: '' }; }
  openNewProduct(): void { this.router.navigate(['/inventory/products'], { queryParams: { create: 1 } }); }
  openEditProduct(p: any): void { if (!p) return; this.editingProductId.set(p.id); this.product = { ...this.newProduct(), ...p }; this.drawerOpen.set(true); this.drawerTab.set('general'); }
  closeDrawer(): void { this.drawerOpen.set(false); }
  selectProduct(p: any): void { this.selectedProduct.set(p); }
  clearFilters(): void { this.productSearch = ''; this.filterType = ''; this.filterInventory = ''; this.filterCondition = ''; }
  showToast(message: string): void { this.toast.set(message); setTimeout(() => this.toast.set(''), 2800); }
  showAlert(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info', title?: string, detail?: string): void {
    const icons: any = { success: '✅', danger: '🛑', warning: '⚠️', info: 'ℹ️' };
    const titles: any = { success: 'Operación realizada', danger: 'Acción no completada', warning: 'Confirmación requerida', info: 'Información' };
    this.alertAction = null;
    this.alert.set({ icon: icons[type], type, title: title || titles[type], message, detail, confirm: false });
  }
  confirmAlert(message: string, action: () => void, title = 'Confirmar acción', detail = ''): void {
    this.alertAction = action;
    this.alert.set({ icon: '🗑️', type: 'warning', title, message, detail, confirm: true });
  }
  closeAlert(): void { this.alert.set(null); this.alertAction = null; }
  acceptAlert(): void { const action = this.alertAction; this.alert.set(null); this.alertAction = null; if (action) action(); }

  loadAll(): void {
    this.loading.set(true);
    this.http.get<Summary>(`${API}/summary`).subscribe(v => this.summary.set(v));
    this.http.get<any>(`${API}/catalogs/overview`).subscribe(v => this.catalogOverview.set(v));
    this.http.get<any[]>(`${API}/categories`).subscribe(v => this.categories.set(v));
    this.http.get<any[]>(`${API}/brands`).subscribe(v => this.brands.set(v));
    this.http.get<any[]>(`${API}/vehicle-models`).subscribe(v => this.vehicleModels.set(v));
    this.http.get<any[]>(`${API}/characteristics`).subscribe(v => this.characteristics.set(v));
    this.http.get<any[]>(`${API}/engine-series`).subscribe(v => this.engineSeries.set(v));
    this.http.get<any[]>(`${API}/warehouses`).subscribe(v => { this.warehouses.set(v); this.ensureLotWarehouse(); });
    this.http.get<any[]>(`${API}/products`).subscribe(v => { this.products.set(v); this.loading.set(false); });
    this.http.get<any[]>(`${API}/products/trash`).subscribe(v => this.deletedProducts.set(v));
    this.http.get<any[]>(`${API}/lots`).subscribe(v => this.lots.set(v));
    this.http.get<any[]>(`${API}/kardex`).subscribe(v => this.kardex.set(v));
    this.http.get<any[]>(`${API}/warehouse-exits`).subscribe(v => this.warehouseExits.set(v));
    this.http.get<any[]>(`${API}/sales-invoices`).subscribe(v => this.salesInvoices.set(v));
    this.http.get<any[]>(`${API}/purchases`).subscribe(v => this.purchases.set(v));
    this.http.get<any[]>(`${API}/suppliers`).subscribe(v => this.suppliers.set(v));
    this.http.get<any[]>(`${API}/customers`).subscribe(v => this.customers.set(v));
    if (this.selectedCatalogType === 'trash') this.loadCatalogTrash();
  }
  visibleCatalogItems(): any[] {
    const q = this.catalogSearch.toLowerCase().trim();
    let rows: any[] = [];
    if (this.selectedCatalogType === 'categories') rows = this.categories().map(c => ({ catalogType: 'categories', id: c.id, kindLabel: '📂 Categoría', title: c.name, subtitle: `${c.category_kind || 'producto'} · prefijo ${c.sku_prefix || '—'}`, rules: `${c.requires_engine_series ? 'Requiere serie motor · ' : ''}${c.handles_inventory ? 'Inventariable' : 'No inventariable'}` }));
    if (this.selectedCatalogType === 'brands') rows = this.brands().map(b => ({ catalogType: 'brands', id: b.id, kindLabel: '🚘 Marca', title: b.name, subtitle: 'Marca / fabricante', rules: 'Disponible en selectores' }));
    if (this.selectedCatalogType === 'vehicleModels') rows = this.vehicleModels().map(m => ({ catalogType: 'vehicle-models', id: m.id, kindLabel: '🚙 Modelo/Línea', title: m.name, subtitle: this.modelBrandName(m.brand_id), rules: 'Usable en compatibilidades' }));
    if (this.selectedCatalogType === 'engineSeries') rows = this.engineSeries().map(e => ({ catalogType: 'engine-series', id: e.id, kindLabel: '⚙️ Serie motor', title: e.code, subtitle: `${e.name || ''} · ${e.brand_name || 'sin marca'} · ${e.fuel_type || 'sin combustible'}`, rules: `CC ${e.displacement_cc || '—'} · ${e.cylinders || '—'} cil. · prefijo ${e.sku_prefix || '—'}` }));
    if (this.selectedCatalogType === 'characteristics') rows = this.characteristics().map(c => ({ catalogType: 'characteristics', id: c.id, kindLabel: '🏷️ Característica', title: c.name, subtitle: c.description || 'Sin descripción', rules: 'Chips en producto' }));
    if (this.selectedCatalogType === 'warehouses') rows = this.warehouses().map(w => ({ catalogType: 'warehouses', id: w.id, kindLabel: '🏬 Bodega', title: w.code, subtitle: `${w.name} · ${w.location || 'sin ubicación'}`, rules: w.is_default ? 'Bodega por defecto' : 'Operativa' }));
    if (this.selectedCatalogType === 'trash') rows = this.catalogTrash().map(t => ({ catalogType: t.catalog_type, id: t.id, kindLabel: `🗑️ ${t.catalog_label}`, title: t.title, subtitle: t.subtitle, rules: 'Restaurable', deleted: true }));
    return rows.filter(x => !q || `${x.kindLabel} ${x.title} ${x.subtitle} ${x.rules}`.toLowerCase().includes(q));
  }

  seedDefaultCatalogs(): void {
    this.confirmAlert('¿Cargar catálogos base de Intermotores?', () => {
      this.saving.set(true);
      this.http.post(`${API}/catalogs/seed-defaults`, {}).subscribe({
        next: (v: any) => { this.catalogOverview.set(v); this.saving.set(false); this.showAlert('Catálogos base cargados correctamente.', 'success', 'Catálogos inteligentes'); this.loadAll(); },
        error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudieron cargar los catálogos base.'), 'danger'); }
      });
    }, 'Cargar catálogos base', 'Se crearán categorías, marcas, características y series comunes si no existen. No duplica registros existentes.');
  }

  exportCatalogsCsv(): void {
    const rows = this.visibleCatalogItems().map(x => ({ tipo: x.kindLabel, nombre_codigo: x.title, detalle: x.subtitle, reglas: x.rules }));
    this.downloadCsv('catalogos_v14_7_1.csv', rows);
  }

  showAutomationRules(): void {
    this.showAlert('Automatizaciones activas: serie motor autocompleta combustible, CC, cilindros, equivalencias y prefijo SKU; categoría sugiere tipo, modo inventario, requisito de serie y prefijo SKU; precios vinculados recalculan precio venta/oferta con descuento configurable.', 'info', '🤖 Motor de automatizaciones v1', 'La fuente de verdad seguirá centralizada en Configuración, con acceso contextual desde cada módulo.');
  }

  applySeriesDefaults(): void {
    const id = Number(this.product.engine_series_id || 0);
    const local = this.engineSeries().find(x => Number(x.id) === id);
    if (!id || !local) return;
    const apply = (s: any) => {
      this.product.fuel_type = s.fuel_type || this.product.fuel_type;
      this.product.displacement_cc = s.displacement_cc || this.product.displacement_cc;
      this.product.cylinders = s.cylinders || this.product.cylinders;
      this.product.compatible_engine_series_tags = s.equivalent_series || this.product.compatible_engine_series_tags;
      if (!this.product.sku && s.sku_prefix) this.product.sku = `${s.sku_prefix}-`;
      this.showAlert('Datos automotrices sugeridos desde la serie de motor. Puedes ajustarlos si el caso lo requiere.', 'success', 'Automatización aplicada');
    };
    this.http.get<any>(`${API}/automation/engine-series/${id}`).subscribe({ next: apply, error: () => apply(local) });
  }
  applyCategoryDefaults(categoryId: any): void {
    const id = Number(categoryId || 0);
    const local = this.categories().find(x => Number(x.id) === id);
    if (!id || !local) return;
    const apply = (c: any) => {
      if (c.product_type_suggestion) this.product.product_type = c.product_type_suggestion;
      this.product.inventory_mode = c.handles_inventory ? 'inventariable' : 'servicio';
      if (!this.product.sku && c.sku_prefix) this.product.sku = `${c.sku_prefix}-`;
      if (c.requires_engine_series && !this.product.engine_series_id) this.showAlert('Esta categoría requiere serie de motor. Selecciónala en la pestaña Automotriz para autocompletar datos.', 'info', 'Regla de categoría');
    };
    this.http.get<any>(`${API}/automation/category/${id}`).subscribe({ next: apply, error: () => apply({ sku_prefix: local.sku_prefix, requires_engine_series: local.requires_engine_series, handles_inventory: local.handles_inventory, product_type_suggestion: local.name?.toLowerCase() === 'motor' ? 'motor' : 'repuesto' }) });
  }
  defaultWarehouseId(): number | null { const def = this.warehouses().find(w => w.is_default) || this.warehouses()[0]; return def ? Number(def.id) : null; }
  ensureLotWarehouse(): void { if (!this.lot.warehouse_id) this.lot.warehouse_id = this.defaultWarehouseId(); }
  lotPayload(): any { const payload = { ...this.lot }; delete payload.condition; payload.product_id = payload.product_id ? Number(payload.product_id) : null; payload.warehouse_id = payload.warehouse_id ? Number(payload.warehouse_id) : this.defaultWarehouseId(); return payload; }
  applyProductToLot(): void { const p = this.products().find(x => x.id === this.lot.product_id); if (!p) return; this.ensureLotWarehouse(); this.lot.sale_price = p.price_sale || 0; this.lot.special_lot_price = p.price_offer || p.price_sale || 0; if (!this.lot.lot_code && p.sku) this.lot.lot_code = `${p.sku}-001`; }
  priceSaleChanged(): void { if (!this.product.prices_linked) return; const sale = Number(this.product.price_sale || 0); const discount = Number(this.product.offer_discount_percent || 0) / 100; this.product.price_offer = Number((sale - (sale * discount)).toFixed(2)); }
  priceOfferChanged(): void { if (!this.product.prices_linked) return; const offer = Number(this.product.price_offer || 0); const discount = Number(this.product.offer_discount_percent || 0) / 100; this.product.price_sale = Number((offer * (1 + discount)).toFixed(2)); }
  createCategory(): void { this.post('/categories', this.category, () => this.category = { name: '', description: '', category_kind: 'producto', sku_prefix: '', requires_engine_series: false, handles_inventory: true }); }
  createBrand(): void { this.post('/brands', this.brand, () => this.brand = { name: '' }); }
  createVehicleModel(): void { this.post('/vehicle-models', this.vehicleModel, () => this.vehicleModel = { brand_id: null, name: '' }); }
  modelBrandName(brandId: any): string { return this.brands().find(b => Number(b.id) === Number(brandId))?.name || 'Sin marca'; }
  loadCatalogTrash(): void { this.http.get<any[]>(`${API}/catalogs/trash`).subscribe(v => this.catalogTrash.set(v)); }
  deleteCatalogItem(item: any): void { this.confirmAlert('¿Enviar este catálogo a papelera?', () => { this.http.delete(`${API}/catalogs/${item.catalogType}/${item.id}`).subscribe({ next: () => { this.showAlert('Registro enviado a papelera.', 'success'); this.loadAll(); this.loadCatalogTrash(); }, error: err => this.showAlert(this.errorMessage(err, 'No se pudo enviar a papelera.'), 'danger') }); }, 'Papelera de catálogos', item.title); }
  restoreCatalogItem(item: any): void { this.http.post(`${API}/catalogs/${item.catalogType}/${item.id}/restore`, {}).subscribe({ next: () => { this.showAlert('Registro restaurado correctamente.', 'success'); this.loadAll(); this.loadCatalogTrash(); }, error: err => this.showAlert(this.errorMessage(err, 'No se pudo restaurar.'), 'danger') }); }
  importCatalogCsv(): void { this.http.post<any>(`${API}/catalogs/import-csv`, { catalog_type: this.importCatalogType, csv_text: this.catalogImportText }).subscribe({ next: r => { this.showAlert(`Importados: ${r.imported}. Omitidos: ${r.skipped}.`, r.errors?.length ? 'warning' : 'success', 'Importación CSV', (r.errors || []).join('\n')); this.loadAll(); }, error: err => this.showAlert(this.errorMessage(err, 'No se pudo importar el catálogo.'), 'danger') }); }
  createCharacteristic(): void { this.post('/characteristics', this.characteristic, () => this.characteristic = { name: '', description: '' }); }
  createSeries(): void { this.post('/engine-series', this.series, () => this.series = { code: '', name: '', brand_name: '', fuel_type: '', displacement_cc: '', cylinders: '', equivalent_series: '', sku_prefix: '' }); }
  createWarehouse(): void { this.post('/warehouses', this.warehouse, () => this.warehouse = { code: '', name: '', location: '', is_default: false }); }
  saveProduct(): void { const id = this.editingProductId(); id ? this.put(`/products/${id}`, this.product, () => { this.closeDrawer(); this.selectedProduct.set(null); }) : this.post('/products', this.product, () => { this.product = this.newProduct(); this.closeDrawer(); }); }
  syncAccountingQty(): void { if (!this.lot.is_out_of_accounting_inventory && !this.editingLotId()) this.lot.accounting_initial_qty = this.lot.physical_initial_qty; }
  onOutAccountingChange(): void { if (this.lot.is_out_of_accounting_inventory) this.lot.accounting_initial_qty = 0; else this.lot.accounting_initial_qty = this.lot.physical_initial_qty; }
  resetLotForm(): void { this.editingLotId.set(null); this.lot = this.newLot(); this.ensureLotWarehouse(); this.selectedLot.set(null); }
  selectLot(l: any): void { this.selectedLot.set(l); }
  openEditLot(l: any): void { if (!l) return; this.editingLotId.set(l.id); this.selectedLot.set(l); this.lot = { ...this.newLot(), ...l, physical_initial_qty: l.physical_qty, accounting_initial_qty: l.accounting_qty }; }
  saveLot(): void { this.ensureLotWarehouse(); if (!this.lot.product_id) { this.showAlert('Selecciona un producto antes de guardar el lote.', 'warning'); return; } if (!this.lot.warehouse_id) { this.showAlert('No hay bodega disponible. Crea una bodega o actualiza para generar CENTRAL automáticamente.', 'warning'); return; } this.lot.quantity_initial = this.lot.physical_initial_qty; const id = this.editingLotId(); id ? this.put(`/lots/${id}`, this.lotPayload(), () => this.resetLotForm(), 'Lote actualizado correctamente.') : this.post('/lots', this.lotPayload(), () => this.resetLotForm(), 'Lote creado correctamente. Se generó movimiento inicial de Kardex.'); }



  resetCustomerForm(): void { this.customer = this.newCustomer(); }
  createCustomer(useAfterCreate = false): void {
    this.post('/customers', this.customer, () => {
      const created = { ...this.customer };
      if (useAfterCreate) { this.selectCustomer(created); }
      this.resetCustomerForm();
    }, 'Cliente guardado correctamente.');
  }
  selectCustomer(customer: any): void {
    if (!customer) return;
    if (this.tab() === 'facturas') {
      this.directInvoice.client_name = customer.name;
      this.directInvoice.client_tax_id = customer.tax_id || 'CF';
    } else {
      this.warehouseExit.client_name = customer.name;
      this.warehouseExit.client_tax_id = customer.tax_id || 'CF';
    }
    this.showAlert('Cliente seleccionado para el documento actual.', 'success', 'Cliente aplicado');
  }
  prepareCustomerForSale(customer: any): void { this.tab.set('salidas'); this.resetExitForm(); this.selectCustomer(customer); }
  prepareCustomerForInvoice(customer: any): void { this.tab.set('facturas'); this.resetDirectInvoiceForm(); this.selectCustomer(customer); }

  createSupplier(): void {
    this.post('/suppliers', this.supplier, () => {
      this.purchase.supplier_name = this.supplier.name;
      this.purchase.supplier_tax_id = this.supplier.tax_id || 'CF';
      this.supplier = { name: '', tax_id: 'CF', contact_name: '', phone: '', email: '', address: '', notes: '' };
    }, 'Proveedor guardado correctamente y seleccionado en la compra.');
  }

  selectSupplier(supplier: any): void {
    if (!supplier) return;
    this.purchase.supplier_name = supplier.name;
    this.purchase.supplier_tax_id = supplier.tax_id || 'CF';
    this.showAlert('Proveedor seleccionado para la compra.', 'info', 'Proveedor');
  }

  resetPurchaseForm(): void { this.purchase = this.newPurchase(); this.purchaseLine = this.newPurchaseLine(); this.purchaseLines = []; this.selectedPurchase.set(null); this.selectedPurchaseLines.set([]); this.editingPurchaseId.set(null); }
  applyProductToPurchase(): void {
    const p = this.products().find(x => x.id === this.purchaseLine.product_id);
    if (!p) return;
    if (!this.purchaseLine.lot_code && p.sku) this.purchaseLine.lot_code = `${p.sku}-${String(this.purchaseLines.length + 1).padStart(3, '0')}`;
    if (!Number(this.purchaseLine.unit_cost_with_tax || 0)) this.purchaseLine.unit_cost_with_tax = 0;
  }
  lineTotal(line: any): number { return Number((Number(line.quantity || 0) * Number(line.unit_cost_with_tax || 0)).toFixed(2)); }
  purchaseTotal(): number { return Number(this.purchaseLines.reduce((sum, line) => sum + this.lineTotal(line), 0).toFixed(2)); }
  addPurchaseLine(): void {
    if (!this.purchaseLine.product_id) { this.showAlert('Selecciona un producto antes de agregar la línea.', 'warning'); return; }
    const qty = Number(this.purchaseLine.quantity || 0);
    if (qty <= 0) { this.showAlert('La cantidad debe ser mayor que cero.', 'warning'); return; }
    const cost = Number(this.purchaseLine.unit_cost_with_tax || 0);
    if (cost < 0) { this.showAlert('El costo unitario no puede ser negativo.', 'warning'); return; }
    this.purchaseLines = [...this.purchaseLines, { ...this.purchaseLine, product_id: Number(this.purchaseLine.product_id), quantity: qty, unit_cost_with_tax: cost, warehouse_id: this.purchase.warehouse_id || this.defaultWarehouseId() }];
    this.purchaseLine = this.newPurchaseLine();
  }
  removePurchaseLine(index: number): void { this.purchaseLines = this.purchaseLines.filter((_, i) => i !== index); }
  savePurchaseDraft(): void {
    if (!this.purchaseLines.length) this.addPurchaseLine();
    if (!this.purchaseLines.length) return;
    const payload = { ...this.purchase, status: 'borrador', warehouse_id: this.purchase.warehouse_id || this.defaultWarehouseId(), lines: this.purchaseLines.map(line => ({ ...line, warehouse_id: line.warehouse_id || this.purchase.warehouse_id || this.defaultWarehouseId() })) };
    this.post('/purchases', payload, () => { this.resetPurchaseForm(); this.tab.set('compras'); }, 'Compra guardada como borrador. No afectó inventario ni Kardex.');
  }
  createPurchase(): void {
    if (!this.purchaseLines.length) this.addPurchaseLine();
    if (!this.purchaseLines.length) return;
    const status = this.purchase.status === 'borrador' ? 'borrador' : 'registrada';
    const payload = { ...this.purchase, status, warehouse_id: this.purchase.warehouse_id || this.defaultWarehouseId(), lines: this.purchaseLines.map(line => ({ ...line, warehouse_id: line.warehouse_id || this.purchase.warehouse_id || this.defaultWarehouseId() })) };
    if (this.editingPurchaseId()) {
      this.put(`/purchases/${this.editingPurchaseId()}`, payload, () => { this.resetPurchaseForm(); this.tab.set('compras'); }, 'Compra en borrador actualizada. No afectó inventario ni Kardex.');
      return;
    }
    const msg = status === 'borrador' ? 'Compra guardada como borrador. No afectó inventario ni Kardex.' : 'Compra registrada correctamente. Se crearon los lotes y se generó Kardex de entrada.';
    this.post('/purchases', payload, () => { this.resetPurchaseForm(); this.tab.set('compras'); }, msg);
  }
  selectPurchase(purchase: any): void {
    this.selectedPurchase.set(purchase);
    this.http.get<any[]>(`${API}/purchases/${purchase.id}/lines`).subscribe(v => this.selectedPurchaseLines.set(v));
  }
  editPurchaseDraft(purchase: any): void {
    if (!purchase || purchase.status !== 'borrador') { this.showAlert('Solo se pueden editar compras en borrador.', 'warning'); return; }
    this.selectPurchase(purchase);
    this.editingPurchaseId.set(Number(purchase.id));
    this.purchase = {
      supplier_name: purchase.supplier_name || 'Proveedor general',
      supplier_tax_id: purchase.supplier_tax_id || 'CF',
      warehouse_id: purchase.warehouse_id || this.defaultWarehouseId(),
      document_reference: purchase.document_reference || '',
      status: 'borrador',
      notes: purchase.notes || '',
      internal_notes: purchase.internal_notes || '',
      lines: []
    };
    this.http.get<any[]>(`${API}/purchases/${purchase.id}/lines`).subscribe(lines => {
      this.purchaseLines = lines.map(line => ({
        product_id: Number(line.product_id),
        warehouse_id: line.warehouse_id || this.purchase.warehouse_id || this.defaultWarehouseId(),
        lot_code: '',
        quantity: Number(line.quantity || 0),
        unit_cost_with_tax: Number(line.unit_cost_with_tax || 0),
        is_out_of_accounting_inventory: !!line.is_out_of_accounting_inventory,
        notes: line.notes || ''
      }));
      this.selectedPurchaseLines.set(lines);
      this.showAlert('Compra en borrador cargada para edición. Puedes modificar líneas y guardar.', 'info', 'Editar borrador');
    });
  }
  lotCode(lotId: any): string { const l = this.lots().find(x => Number(x.id) === Number(lotId)); return l ? l.lot_code : '—'; }
  registerPurchase(purchase: any): void {
    if (!purchase || purchase.status !== 'borrador') return;
    this.confirmAlert(`¿Registrar la compra ${purchase.purchase_code}?`, () => {
      this.post(`/purchases/${purchase.id}/register`, {}, () => { this.selectedPurchase.set(null); this.selectedPurchaseLines.set([]); }, 'Compra registrada correctamente. Se crearon los lotes y Kardex de entrada.');
    }, 'Registrar compra', 'Al registrar se crearán los lotes y se afectará inventario físico/contable según corresponda.');
  }

  printPurchase(purchase: any): void {
    if (!purchase) return;
    const lines = this.selectedPurchase()?.id === purchase.id ? this.selectedPurchaseLines() : [];
    const rows = lines.map((l: any) => `<tr><td>${this.productName(l.product_id)}</td><td>${this.lotCode(l.lot_id)}</td><td>${l.quantity}</td><td>Q ${l.unit_cost_with_tax}</td><td>Q ${Number(l.line_total_with_tax || 0).toFixed(2)}</td></tr>`).join('');
    const html = `<html><head><title>${purchase.purchase_code}</title><style>body{font-family:Arial;padding:24px}h1{margin-bottom:4px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}.total{text-align:right;font-size:18px;margin-top:16px}</style></head><body><h1>Compra ${purchase.purchase_code}</h1><p class="muted">Proveedor: ${purchase.supplier_name} · NIT: ${purchase.supplier_tax_id} · Estado: ${purchase.status}</p><p>Documento: ${purchase.document_reference || '—'}</p><table><thead><tr><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Costo con IVA</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Selecciona la compra para cargar el detalle antes de imprimir.</td></tr>'}</tbody></table><div class="total"><strong>Total: Q ${Number(purchase.total || 0).toFixed(2)}</strong></div><p class="muted">Costos con IVA incluido · Fecha formato dd/MM/yyyy · ERP Intermotores v14</p></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  }

  voidPurchase(purchase: any): void {
    if (!purchase) return;
    this.confirmAlert(`Se anulará la compra ${purchase.purchase_code} y se revertirán sus lotes si no tuvieron movimientos posteriores.`, () => {
      this.post(`/purchases/${purchase.id}/void`, { reason: 'Anulación solicitada desde Compras Pro' }, () => { this.selectedPurchase.set(null); this.selectedPurchaseLines.set([]); }, 'Compra anulada correctamente. Se revirtió la entrada en Kardex.');
    }, 'Anular compra');
  }

  resetExitForm(): void { this.warehouseExit = this.newWarehouseExit(); this.exitLine = this.newExitLine(); }
  applyLotToExit(): void { const l = this.lots().find(x => x.id === this.exitLine.lot_id); if (!l) return; this.exitLine.unit_price_reference = l.special_lot_price || l.sale_price || 0; }
  createWarehouseExit(): void {
    if (!this.exitLine.lot_id) { this.showAlert('Selecciona un lote para crear la salida.', 'warning'); return; }
    const qty = Number(this.exitLine.quantity || 0);
    if (qty <= 0) { this.showAlert('La cantidad debe ser mayor que cero.', 'warning'); return; }
    const l = this.lots().find(x => x.id === this.exitLine.lot_id);
    if (l && qty > Number(l.available_physical || 0)) { this.showAlert(`La cantidad supera el disponible físico del lote. Disponible: ${l.available_physical}.`, 'warning'); return; }
    const payload = { ...this.warehouseExit, lines: [{ ...this.exitLine, lot_id: Number(this.exitLine.lot_id), quantity: qty }] };
    this.post('/warehouse-exits', payload, () => this.resetExitForm(), 'Salida de bodega creada correctamente. Se descontó físico y quedó pendiente de facturar.');
  }




  openPOS(): void { this.tab.set('pos'); if (!this.posCart.length) this.posInvoice = this.newDirectInvoice(); }
  resetPOS(): void { this.posInvoice = this.newDirectInvoice(); this.posLine = this.newDirectInvoiceLine(); this.posCart = []; this.posSearch = ''; this.posGlobalDiscountPercent = 0; this.posCashReceived = 0; this.posPaymentMethod = 'efectivo'; }
  applyPOSCustomerByName(): void {
    const c = this.customers().find(x => x.name === this.posInvoice.client_name);
    this.posInvoice.client_tax_id = c?.tax_id || 'CF';
  }
  createPOSQuickCustomer(): void {
    if (!this.posQuickCustomer.name?.trim()) { this.showAlert('Ingresa el nombre del cliente rápido.', 'warning'); return; }
    const payload = { ...this.posQuickCustomer, tax_id: this.posQuickCustomer.tax_id || 'CF' };
    this.post('/customers', payload, () => {
      this.posInvoice.client_name = payload.name;
      this.posInvoice.client_tax_id = payload.tax_id || 'CF';
      this.posQuickCustomer = { name: '', tax_id: 'CF', phone: '' };
    }, 'Cliente creado y seleccionado en el POS.');
  }
  addPOSLot(l: any): void {
    if (!l) return;
    if (Number(l.available_physical || 0) <= 0) { this.showAlert('Este lote no tiene disponible físico para vender.', 'warning'); return; }
    const existing = this.posCart.find(x => Number(x.lot_id) === Number(l.id));
    if (existing) { this.validatePOSLine({ ...existing, quantity: Number(existing.quantity || 0) + 1 }); existing.quantity = Math.min(Number(existing.quantity || 0) + 1, Number(l.available_physical || 0)); return; }
    this.posCart = [...this.posCart, { lot_id: Number(l.id), quantity: 1, unit_price: Number(l.special_lot_price || l.sale_price || 0), discount_percent: 0, notes: 'Venta POS' }];
  }
  validatePOSLine(line: any): void {
    const l = this.lots().find(x => Number(x.id) === Number(line.lot_id));
    if (!l) return;
    const max = Number(l.available_physical || 0);
    if (Number(line.quantity || 0) > max) { line.quantity = max; this.showAlert(`Cantidad ajustada al disponible físico del lote: ${max}.`, 'warning'); }
    if (Number(line.quantity || 0) < 1) line.quantity = 1;
    if (Number(line.discount_percent || 0) < 0) line.discount_percent = 0;
    if (Number(line.discount_percent || 0) > 100) line.discount_percent = 100;
  }
  removePOSLine(index: number): void { this.posCart = this.posCart.filter((_, i) => i !== index); }
  posLineSubtotal(line: any): number { return Number((Number(line.quantity || 0) * Number(line.unit_price || 0)).toFixed(2)); }
  posLineDiscount(line: any): number { return Number((this.posLineSubtotal(line) * (Number(line.discount_percent || 0) / 100)).toFixed(2)); }
  posLineTotal(line: any): number { return Number((this.posLineSubtotal(line) - this.posLineDiscount(line)).toFixed(2)); }
  posSubtotal(): number { return Number(this.posCart.reduce((acc, line) => acc + this.posLineSubtotal(line), 0).toFixed(2)); }
  posLineDiscountTotal(): number { return Number(this.posCart.reduce((acc, line) => acc + this.posLineDiscount(line), 0).toFixed(2)); }
  posGlobalDiscountAmount(): number { return Number(((this.posSubtotal() - this.posLineDiscountTotal()) * (Number(this.posGlobalDiscountPercent || 0) / 100)).toFixed(2)); }
  posDiscountTotal(): number { return Number((this.posLineDiscountTotal() + this.posGlobalDiscountAmount()).toFixed(2)); }
  posTotal(): number { return Number((this.posSubtotal() - this.posDiscountTotal()).toFixed(2)); }
  posChange(): number { return Number(Math.max(0, Number(this.posCashReceived || 0) - this.posTotal()).toFixed(2)); }
  readPendingPOS(): any[] { try { return JSON.parse(localStorage.getItem('erp_pos_pending') || '[]'); } catch { return []; } }
  persistPendingPOS(): void { localStorage.setItem('erp_pos_pending', JSON.stringify(this.pendingPOSCarts)); }
  savePendingPOS(): void {
    if (!this.posCart.length) { this.showAlert('Agrega productos al carrito antes de guardar pendiente.', 'warning'); return; }
    const pending = { client_name: this.posInvoice.client_name || 'Consumidor final', client_tax_id: this.posInvoice.client_tax_id || 'CF', notes: this.posInvoice.notes || '', payment_method: this.posPaymentMethod, global_discount_percent: this.posGlobalDiscountPercent, cash_received: this.posCashReceived, cart: this.posCart, total: this.posTotal(), created_at: new Date().toLocaleString('es-GT') };
    this.pendingPOSCarts = [pending, ...this.pendingPOSCarts].slice(0, 10);
    this.persistPendingPOS();
    this.showAlert('Venta pendiente guardada localmente en este equipo.', 'success', 'POS pendiente');
  }
  loadPendingPOS(index: number): void {
    const pending = this.pendingPOSCarts[index]; if (!pending) return;
    this.posInvoice.client_name = pending.client_name; this.posInvoice.client_tax_id = pending.client_tax_id; this.posInvoice.notes = pending.notes;
    this.posPaymentMethod = pending.payment_method || 'efectivo'; this.posGlobalDiscountPercent = Number(pending.global_discount_percent || 0); this.posCashReceived = Number(pending.cash_received || 0); this.posCart = pending.cart || [];
    this.showAlert('Venta pendiente cargada en el carrito.', 'success', 'POS');
  }
  loadLastPendingPOS(): void { this.loadPendingPOS(0); }
  chargePOS(): void {
    if (!this.posCart.length) { this.showAlert('Agrega productos al carrito antes de cobrar.', 'warning'); return; }
    for (const line of this.posCart) {
      this.validatePOSLine(line);
      const l = this.lots().find(x => Number(x.id) === Number(line.lot_id));
      if (!l) { this.showAlert('Uno de los lotes del carrito ya no existe.', 'danger'); return; }
      if (Number(line.quantity || 0) > Number(l.available_physical || 0)) { this.showAlert(`El lote ${l.lot_code} no tiene suficiente existencia. Disponible: ${l.available_physical}.`, 'warning'); return; }
    }
    const lines = this.posCart.map(line => ({ ...line, lot_id: Number(line.lot_id), quantity: Number(line.quantity || 0), unit_price: this.posLineTotal(line) / Number(line.quantity || 1), notes: `POS · precio Q${line.unit_price} · desc. ${line.discount_percent || 0}%` }));
    const payload = { ...this.posInvoice, internal_notes: `Venta creada desde POS Pro Consolidado. Método de pago: ${this.posPaymentMethod}. Descuento general: ${this.posGlobalDiscountPercent || 0}%. Recibido: Q${this.posCashReceived || 0}. Vuelto: Q${this.posChange()}.`, notes: this.posInvoice.notes || 'Venta POS', lines };
    this.post('/sales-invoices/direct', payload, () => { this.resetPOS(); this.tab.set('facturas'); }, 'Venta POS facturada correctamente. Se descontó inventario según reglas.');
  }
  printPOSTicketPreview(): void {
    const rows = this.posCart.map(line => `<tr><td>${this.productNameByLot(line.lot_id)}<br><small>${this.lotCode(line.lot_id)}</small></td><td>${line.quantity}</td><td>Q ${line.unit_price}</td><td>${line.discount_percent||0}%</td><td>Q ${this.posLineTotal(line)}</td></tr>`).join('');
    const html = `<html><head><title>Ticket POS</title><style>body{font-family:Arial;padding:20px;background:#f8fafc}.ticket{max-width:420px;margin:auto;background:white;padding:22px;border-radius:18px;box-shadow:0 20px 50px rgba(15,23,42,.12)}h2{margin:0}table{width:100%;border-collapse:collapse;margin-top:14px}td{border-bottom:1px dashed #ddd;padding:7px 0;font-size:13px}.total{text-align:right;font-size:24px;margin-top:14px;font-weight:bold}.muted{color:#64748b}.pay{background:#ecfdf5;border:1px solid #bbf7d0;border-radius:14px;padding:10px;margin-top:10px}</style></head><body><div class="ticket"><h2>Intermotores</h2><p>Ticket POS · Cliente: ${this.posInvoice.client_name || 'Consumidor final'} · NIT: ${this.posInvoice.client_tax_id || 'CF'}</p><p class="muted">Pago: ${this.posPaymentMethod} · ${new Date().toLocaleString('es-GT')}</p><table>${rows}</table><p>Subtotal Q ${this.posSubtotal()}<br>Descuento Q ${this.posDiscountTotal()}</p><div class="total">Total Q ${this.posTotal()}</div><div class="pay">Recibido: Q ${this.posCashReceived || 0}<br>Vuelto: Q ${this.posChange()}</div><p>Vista previa. Al cobrar se generará factura directa.</p></div></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  }

  resetDirectInvoiceForm(): void { this.directInvoice = this.newDirectInvoice(); this.directInvoiceLine = this.newDirectInvoiceLine(); this.directInvoiceLines = []; }
  applyLotToDirectInvoice(): void { const l = this.lots().find(x => x.id === this.directInvoiceLine.lot_id); if (!l) return; this.directInvoiceLine.unit_price = l.special_lot_price || l.sale_price || 0; }
  addDirectInvoiceLine(): void {
    if (!this.directInvoiceLine.lot_id) { this.showAlert('Selecciona un lote antes de agregar la línea.', 'warning'); return; }
    const qty = Number(this.directInvoiceLine.quantity || 0);
    if (qty <= 0) { this.showAlert('La cantidad debe ser mayor que cero.', 'warning'); return; }
    const l = this.lots().find(x => Number(x.id) === Number(this.directInvoiceLine.lot_id));
    if (!l) { this.showAlert('El lote seleccionado no existe.', 'warning'); return; }
    if (qty > Number(l.available_physical || 0)) { this.showAlert(`La cantidad supera el disponible físico del lote. Disponible: ${l.available_physical}.`, 'warning'); return; }
    const existing = this.directInvoiceLines.find(x => Number(x.lot_id) === Number(this.directInvoiceLine.lot_id));
    if (existing) { this.showAlert('Ese lote ya está agregado. Elimina la línea anterior si necesitas cambiar la cantidad.', 'warning'); return; }
    this.directInvoiceLines = [...this.directInvoiceLines, { ...this.directInvoiceLine, lot_id: Number(this.directInvoiceLine.lot_id), quantity: qty, unit_price: Number(this.directInvoiceLine.unit_price || 0) }];
    this.directInvoiceLine = this.newDirectInvoiceLine();
  }
  removeDirectInvoiceLine(index: number): void { this.directInvoiceLines = this.directInvoiceLines.filter((_, i) => i !== index); }
  invoiceLineTotal(line: any): number { return Number((Number(line.quantity || 0) * Number(line.unit_price || 0)).toFixed(2)); }
  directInvoiceSubtotal(): number { return Number(this.directInvoiceLines.reduce((acc, line) => acc + this.invoiceLineTotal(line), 0).toFixed(2)); }
  productNameByLot(lotId: any): string { const l = this.lots().find(x => Number(x.id) === Number(lotId)); return l ? this.productName(l.product_id) : '—'; }
  createDirectInvoice(): void {
    if (!this.directInvoiceLines.length) { this.showAlert('Agrega al menos una línea a la factura directa.', 'warning'); return; }
    for (const line of this.directInvoiceLines) {
      const l = this.lots().find(x => Number(x.id) === Number(line.lot_id));
      if (l && Number(line.quantity || 0) > Number(l.available_physical || 0)) { this.showAlert(`El lote ${l.lot_code} no tiene suficiente disponible físico. Disponible: ${l.available_physical}.`, 'warning'); return; }
    }
    const payload = { ...this.directInvoice, lines: this.directInvoiceLines.map(line => ({ ...line, lot_id: Number(line.lot_id), quantity: Number(line.quantity || 0), unit_price: Number(line.unit_price || 0) })) };
    this.post('/sales-invoices/direct', payload, () => { this.resetDirectInvoiceForm(); this.tab.set('facturas'); }, 'Factura directa creada correctamente. Se descontó físico y contable cuando aplica.');
  }

  voidExit(s: any): void {
    if (!s || s.status === 'anulada' || s.is_invoiced) return;
    this.confirmAlert(`¿Anular la salida ${s.exit_code}?`, () => {
      this.saving.set(true);
      this.http.post(`${API}/warehouse-exits/${s.id}/void`, { reason: 'Anulación solicitada desde Inventario Operativo Pro.' }).subscribe({
        next: () => { this.saving.set(false); this.showAlert('Salida anulada correctamente. Se devolvió existencia física.', 'success'); this.loadAll(); },
        error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudo anular la salida.'), 'danger'); }
      });
    }, 'Anular salida de bodega', 'Solo se permite si la salida no ha sido facturada.');
  }

  selectInvoice(f: any): void {
    if (!f) return;
    this.selectedInvoice.set(f);
    this.http.get<any[]>(`${API}/sales-invoices/${f.id}/lines`).subscribe({
      next: lines => this.selectedInvoiceLines.set(lines),
      error: err => this.showAlert(this.errorMessage(err, 'No se pudo cargar el detalle de la factura.'), 'danger')
    });
  }

  printInvoice(f: any): void {
    if (!f) return;
    const openPrint = (lines: any[]) => {
      const rows = lines.map(line => `
        <tr>
          <td>${this.lotCode(line.lot_id)}<br><small>${this.productName(line.product_id)}</small></td>
          <td class="num">${line.quantity}</td>
          <td class="num">Q ${line.unit_price || 0}</td>
          <td class="num"><strong>Q ${line.total_line || 0}</strong></td>
        </tr>`).join('');
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${f.invoice_code}</title>
        <style>body{font-family:Arial,sans-serif;color:#111827;margin:32px}.top{display:flex;justify-content:space-between;border-bottom:3px solid #111827;padding-bottom:16px}.brand h1{margin:0;font-size:24px}.doc{text-align:right}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#e0f2fe;color:#075985;font-weight:bold}.badge.void{background:#fee2e2;color:#991b1b}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:#f3f4f6;text-align:left}th,td{padding:10px;border-bottom:1px solid #e5e7eb}.num{text-align:right}.totals{margin-left:auto;margin-top:20px;width:320px}.totals div{display:flex;justify-content:space-between;padding:8px 0}.total{font-size:20px;border-top:2px solid #111827}.meta{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}.box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px}@media print{button{display:none}body{margin:20px}}</style></head><body>
        <div class="top"><div class="brand"><h1>Intermotores</h1><p>ERP Intermotores v14 · Factura</p></div><div class="doc"><h2>${f.invoice_code}</h2><span class="badge ${f.status === 'anulada' ? 'void' : ''}">${f.status}</span><p>${f.source_exit_id ? 'Origen: salida ' + this.exitCode(f.source_exit_id) : 'Factura directa'}</p></div></div>
        <div class="meta"><div class="box"><strong>Cliente</strong><p>${f.client_name}<br>NIT: ${f.client_tax_id || 'CF'}</p></div><div class="box"><strong>Observaciones</strong><p>${f.notes || 'Sin observaciones'}</p></div></div>
        <table><thead><tr><th>Lote / Producto</th><th class="num">Cantidad</th><th class="num">Precio</th><th class="num">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sin líneas cargadas</td></tr>'}</tbody></table>
        <div class="totals"><div><span>Subtotal</span><strong>Q ${f.subtotal || 0}</strong></div><div><span>IVA</span><strong>Q ${f.tax_total || 0}</strong></div><div class="total"><span>Total</span><strong>Q ${f.total || 0}</strong></div></div>
        <script>window.onload=()=>window.print()</script></body></html>`;
      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) { window.print(); return; }
      w.document.open(); w.document.write(html); w.document.close();
    };
    this.http.get<any[]>(`${API}/sales-invoices/${f.id}/lines`).subscribe({
      next: lines => { this.selectedInvoice.set(f); this.selectedInvoiceLines.set(lines); openPrint(lines); },
      error: () => openPrint(this.selectedInvoiceLines())
    });
  }

  voidInvoice(f: any): void {
    if (!f || f.status === 'anulada') return;
    this.confirmAlert(`¿Anular la factura ${f.invoice_code}?`, () => {
      this.saving.set(true);
      this.http.post(`${API}/sales-invoices/${f.id}/void`, { reason: 'Anulación solicitada desde Inventario Operativo Pro.' }).subscribe({
        next: () => { this.saving.set(false); this.showAlert('Factura anulada correctamente. Se devolvieron existencias según su origen.', 'success'); this.loadAll(); },
        error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudo anular la factura.'), 'danger'); }
      });
    }, 'Anular factura', 'Si la factura viene de una salida, la salida volverá a quedar pendiente de facturar.');
  }

  invoiceExit(s: any): void {
    if (!s || s.is_invoiced) return;
    this.confirmAlert(
      `¿Facturar la salida ${s.exit_code}?`,
      () => {
        this.saving.set(true);
        this.http.post(`${API}/warehouse-exits/${s.id}/invoice`, { warehouse_exit_id: s.id, notes: 'Factura generada desde salida de bodega.' }).subscribe({
          next: () => { this.saving.set(false); this.showAlert('Factura creada correctamente. Se descontó contable sin volver a descontar físico.', 'success'); this.loadAll(); this.tab.set('facturas'); },
          error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudo facturar la salida.'), 'danger'); }
        });
      },
      'Crear factura desde salida',
      'Esta acción no volverá a descontar existencia física. Solo regulariza contable cuando el lote aplica.'
    );
  }
  exitCode(id: number): string { const s = this.warehouseExits().find(x => x.id === id); return s ? s.exit_code : String(id || '—'); }

  productLots(productId: any): any[] { const id = Number(productId || 0); return this.lots().filter(l => Number(l.product_id) === id); }
  productTotals(productId: any): { physical: number; accounting: number } {
    return this.productLots(productId).reduce((acc, l) => ({ physical: acc.physical + Number(l.physical_qty || 0), accounting: acc.accounting + Number(l.accounting_qty || 0) }), { physical: 0, accounting: 0 });
  }
  lotAvailablePhysical(l: any): number { return Number(l?.available_physical || 0); }
  lastExitForProduct(productId: any): string { const lots = new Set(this.productLots(productId).map(l => Number(l.id))); const related = this.warehouseExits().filter(e => (e.lines || []).some((line: any) => lots.has(Number(line.lot_id)))); return related.length ? related[related.length - 1].exit_code : '—'; }
  quickNewLotFromProduct(p: any): void { if (!p) return; this.tab.set('lotes'); this.resetLotForm(); this.lot.product_id = Number(p.id); this.applyProductToLot(); this.showAlert('Formulario de lote preparado para el producto seleccionado.', 'info', 'Acción rápida'); }
  quickPurchaseFromProduct(p: any): void { if (!p) return; this.tab.set('compras'); this.resetPurchaseForm(); this.purchaseLine.product_id = Number(p.id); this.applyProductToPurchase(); this.showAlert('Compra preparada con el producto seleccionado. Revisa proveedor, cantidad y costo antes de registrar.', 'info', 'Acción rápida'); }
  quickExitFromLot(l: any): void { if (!l) return; this.tab.set('salidas'); this.resetExitForm(); this.exitLine.lot_id = Number(l.id); this.applyLotToExit(); this.showAlert('Salida preparada con el lote seleccionado. Revisa cantidad y cliente antes de confirmar.', 'info', 'Acción rápida'); }

  sendLotToTrash(l: any): void {
    if (!l) return;
    this.confirmAlert(`¿Enviar a papelera el lote ${l.lot_code}?`, () => this.http.delete(`${API}/lots/${l.id}`).subscribe({
      next: () => { this.showAlert('Lote enviado a papelera correctamente.', 'success'); this.resetLotForm(); this.loadAll(); },
      error: err => this.showAlert(this.errorMessage(err, 'No se pudo enviar el lote a papelera.'), 'danger')
    }), 'Enviar lote a papelera', 'Solo se permite si el lote no tiene existencia física ni contable.');
  }
  sendToTrash(p: any): void {
    if (!p) return;
    this.confirmAlert(
      `¿Enviar a papelera el producto ${p.sku}?`,
      () => this.http.delete(`${API}/products/${p.id}`).subscribe({
        next: () => { this.showAlert('Producto enviado a papelera correctamente.', 'success', 'Producto en papelera', 'Podrás restaurarlo desde la pestaña Papelera.'); this.selectedProduct.set(null); this.loadAll(); },
        error: err => this.showAlert(this.errorMessage(err, 'No se pudo enviar a papelera.'), 'danger')
      }),
      'Enviar producto a papelera',
      'Esta acción no elimina físicamente el producto; solo aplica soft delete.'
    );
  }
  restoreProduct(p: any): void { this.http.post(`${API}/products/${p.id}/restore`, {}).subscribe({ next: () => { this.showAlert('Producto restaurado correctamente.', 'success', 'Producto activo'); this.loadAll(); }, error: err => this.showAlert(this.errorMessage(err, 'No se pudo restaurar.'), 'danger') }); }


  productsWithoutLotsCount(): number { return this.products().filter(p => this.productLots(p.id).length === 0).length; }
  productsWithoutPriceCount(): number { return this.products().filter(p => Number(p.price_sale || 0) <= 0).length; }
  lowStockLotsCount(): number { return this.lots().filter(l => Number(l.available_physical || 0) <= 1 && !l.is_blocked).length; }
  blockedLotsCount(): number { return this.lots().filter(l => !!l.is_blocked).length; }
  focusProductsWithoutLots(): void { this.tab.set('productos'); this.productSearch = ''; this.filterType = ''; this.filterInventory = ''; this.filterCondition = ''; this.showAlert('Filtra visualmente productos sin lotes desde el panel derecho. En la siguiente consolidación agregaremos vistas guardadas con filtros backend.', 'info', 'Productos sin lote', `${this.productsWithoutLotsCount()} producto(s) sin lote.`); }
  focusProductsWithoutPrice(): void { this.tab.set('productos'); this.productSearch = ''; this.showAlert('Revisa productos sin precio de venta para evitar ventas con precio Q0.00.', 'info', 'Productos sin precio', `${this.productsWithoutPriceCount()} producto(s) sin precio.`); }
  focusLowStockLots(): void { this.tab.set('lotes'); this.lotStatusFilter = 'bajo_stock'; this.showAlert('Filtro aplicado: lotes con disponible físico menor o igual a 1.', 'info', 'Lotes bajo stock'); }
  focusBlockedLots(): void { this.tab.set('lotes'); this.lotStatusFilter = 'bloqueado'; this.showAlert('Filtro aplicado: lotes bloqueados.', 'info', 'Lotes bloqueados'); }
  focusOutAccountingLots(): void { this.tab.set('lotes'); this.lotStatusFilter = 'fuera_contable'; this.showAlert('Filtro aplicado: lotes fuera de inventario contable.', 'info', 'Fuera de inventario contable'); }

  exportProductsCsv(): void {
    const rows = this.filteredProducts().map(p => ({ sku: p.sku, nombre: p.name, tipo: p.product_type, condicion: p.condition, inventario: p.inventory_mode, precio_venta: p.price_sale || 0, precio_oferta: p.price_offer || 0, serie: p.engine_series_id || '', combustible: p.fuel_type || '', cc: p.displacement_cc || '' }));
    this.downloadCsv('productos_v14_7_0.csv', rows);
  }
  exportLotsCsv(): void {
    const rows = this.filteredLots().map(l => ({ lote: l.lot_code, producto: this.productName(l.product_id), fisico: l.physical_qty, contable: l.accounting_qty, disponible_fisico: l.available_physical, disponible_contable: l.available_accounting, costo_con_iva: l.unit_cost || 0, ubicacion: l.location || '', fuera_contable: l.is_out_of_accounting_inventory ? 'si' : 'no', bloqueado: l.is_blocked ? 'si' : 'no', desarmable: l.is_disassemblable ? 'si' : 'no' }));
    this.downloadCsv('lotes_v14_7_0.csv', rows);
  }
  exportInventorySnapshot(): void {
    const rows = [
      { indicador: 'Productos', valor: this.summary()?.products || 0 },
      { indicador: 'Lotes', valor: this.summary()?.lots || 0 },
      { indicador: 'Existencia física', valor: this.summary()?.physical_units || 0 },
      { indicador: 'Existencia contable', valor: this.summary()?.accounting_units || 0 },
      { indicador: 'Productos sin lote', valor: this.productsWithoutLotsCount() },
      { indicador: 'Productos sin precio', valor: this.productsWithoutPriceCount() },
      { indicador: 'Lotes bajo stock', valor: this.lowStockLotsCount() },
      { indicador: 'Lotes bloqueados', valor: this.blockedLotsCount() }
    ];
    this.downloadCsv('snapshot_inventario_v14_7_0.csv', rows);
  }
  printInventorySummary(): void {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Resumen de inventario</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111827}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#f9fafb}.card strong{font-size:28px}h1{margin-bottom:4px}.muted{color:#6b7280}@media print{body{margin:18px}}</style></head><body><h1>📦 Resumen de inventario</h1><p class="muted">ERP Intermotores v14.7.1 · Costos de lote con IVA incluido · Fecha formato dd/MM/yyyy</p><div class="grid"><div class="card"><span>Productos</span><br><strong>${this.summary()?.products || 0}</strong></div><div class="card"><span>Lotes</span><br><strong>${this.summary()?.lots || 0}</strong></div><div class="card"><span>Físico</span><br><strong>${this.summary()?.physical_units || 0}</strong></div><div class="card"><span>Contable</span><br><strong>${this.summary()?.accounting_units || 0}</strong></div><div class="card"><span>Sin lote</span><br><strong>${this.productsWithoutLotsCount()}</strong></div><div class="card"><span>Bajo stock</span><br><strong>${this.lowStockLotsCount()}</strong></div></div><script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }
  showModuleSettings(): void { this.showAlert('Configuración híbrida aprobada: la fuente de verdad vive en Configuración central, pero cada módulo tendrá acceso directo a su sección.', 'info', 'Configuración de Inventario', 'Valores actuales: GTQ, IVA 12%, costos de lote con IVA incluido, bodega CENTRAL por defecto.'); }
  private downloadCsv(filename: string, rows: any[]): void {
    if (!rows.length) { this.showAlert('No hay datos visibles para exportar.', 'warning'); return; }
    const headers = Object.keys(rows[0]);
    const esc = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map(row => headers.map(h => esc(row[h])).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    this.showAlert('Archivo CSV generado correctamente.', 'success', 'Exportación lista', filename);
  }

  private errorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((e: any) => {
        const field = Array.isArray(e?.loc) ? e.loc.join('.') : 'campo';
        return `${field}: ${e?.msg || 'dato inválido'}`;
      }).join(' | ');
    }
    try { return JSON.stringify(detail); } catch { return fallback; }
  }
  private post(path: string, body: any, reset: () => void, okMessage = 'Guardado correctamente.'): void { this.saving.set(true); this.http.post(`${API}${path}`, body).subscribe({ next: () => { reset(); this.saving.set(false); this.showAlert(okMessage, 'success'); this.loadAll(); }, error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudo guardar. Revisa los datos o si ya existe un código duplicado.'), 'danger') } }); }
  private put(path: string, body: any, reset: () => void, okMessage = 'Producto actualizado correctamente.'): void { this.saving.set(true); this.http.put(`${API}${path}`, body).subscribe({ next: () => { reset(); this.saving.set(false); this.showAlert(okMessage, 'success'); this.loadAll(); }, error: err => { this.saving.set(false); this.showAlert(this.errorMessage(err, 'No se pudo actualizar.'), 'danger') } }); }
  productName(id: number): string { const p = this.products().find(x => x.id === id); return p ? `${p.sku}` : String(id || ''); }
}
