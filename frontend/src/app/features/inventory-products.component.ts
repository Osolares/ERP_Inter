import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/inventory';

type ColumnKey =
  | 'no'
  | 'date'
  | 'img'
  | 'sku'
  | 'name'
  | 'classification'
  | 'automotive'
  | 'prices'
  | 'stock'
  | 'status'
  | 'actions';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .page-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1rem}
    .actions{display:flex;gap:.5rem;flex-wrap:wrap}
    .btn{border:0;border-radius:12px;padding:.7rem 1rem;font-weight:700;cursor:pointer;background:#1f2937;color:#fff}
    .btn.primary{background:#0f766e}
    .btn.light{background:#334155}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.8rem;margin-bottom:1rem}
    .stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:1rem}
    .stat strong{font-size:1.5rem;display:block}
    .filters{display:flex;flex-wrap:wrap;gap:.65rem;align-items:end;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:1rem;margin-bottom:1rem}
    .filter{display:flex;flex-direction:column;gap:.25rem;min-width:160px;flex:1 1 180px}
    .filter.wide{flex:2 1 280px}
    label{font-size:.78rem;opacity:.8}
    input,select,textarea{background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:10px;padding:.65rem;width:100%}
    .layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:1rem;align-items:start}
    .grid-card{overflow:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px}
    table{width:100%;border-collapse:separate;border-spacing:0;min-width:980px}
    th,td{padding:.75rem;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:top;text-align:left}
    th{position:sticky;top:0;background:#0b1220;z-index:1;font-size:.78rem;white-space:nowrap}
    tr{cursor:pointer}
    tr:hover{filter:brightness(1.12)}
    .col-no{width:46px;text-align:center;opacity:.8}
    .img{width:42px;height:42px;border-radius:12px;background:#1f2937;display:grid;place-items:center;font-size:1.25rem}
    .muted{opacity:.7;font-size:.82rem}
    .chip{display:inline-flex;border-radius:999px;padding:.2rem .55rem;font-size:.75rem;font-weight:700;background:rgba(255,255,255,.1);margin:.12rem}
    .row-danger{background:rgba(239,68,68,.18)}
    .row-warning{background:rgba(245,158,11,.18)}
    .row-success{background:rgba(34,197,94,.12)}
    .row-neutral{background:rgba(148,163,184,.08)}
    .panel{position:sticky;top:1rem;background:#0f172a;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:1rem}
    .panel h3{margin-top:0}
    .panel-row{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,.07);padding:.55rem 0}
    .drawer{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:stretch end;z-index:20}
    .drawer-body{width:min(720px,100vw);height:100%;overflow:auto;background:#0b1220;padding:1.25rem;border-left:1px solid rgba(255,255,255,.1)}
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem}
    @media(max-width:1100px){.layout{grid-template-columns:1fr}.panel{position:relative}.grid-card{overflow:auto}}
  `],
  template: `
    <section class="page-head">
      <div>
        <div class="muted">Inventario · Productos</div>
        <h1>Productos</h1>
        <p>Tabla principal con filtros responsive, colores por estado y resumen lateral.</p>
      </div>
      <div class="actions">
        <button class="btn light" (click)="exportCsv()">Exportar CSV</button>
        <button class="btn primary" (click)="newProduct()">➕ Nuevo producto</button>
      </div>
    </section>

    <section class="stats">
      <div class="stat"><span>Productos</span><strong>{{ products().length }}</strong></div>
      <div class="stat"><span>Activos</span><strong>{{ activeCount() }}</strong></div>
      <div class="stat"><span>Lotes</span><strong>{{ lots().length }}</strong></div>
      <div class="stat"><span>Disponible</span><strong>{{ totalAvailable() }}</strong></div>
    </section>

    <section class="filters">
      <div class="filter wide">
        <label>Búsqueda</label>
        <input [(ngModel)]="search" placeholder="SKU, producto, OEM, serie, categoría..." />
      </div>

      <div class="filter">
        <label>Características</label>
        <select [(ngModel)]="characteristicFilter">
          <option value="">Todas</option>
          <option *ngFor="let c of characteristics()" [value]="c.name">{{ c.name }}</option>
        </select>
      </div>

      <div class="filter">
        <label>Categoría producto</label>
        <select [(ngModel)]="productCategoryFilter">
          <option value="">Todas</option>
          <option *ngFor="let c of productCategories()" [value]="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="filter">
        <label>Serie motor</label>
        <select [(ngModel)]="seriesFilter">
          <option value="">Todas</option>
          <option *ngFor="let s of series()" [value]="s.id">{{ s.code }} · {{ s.name }}</option>
        </select>
      </div>

      <div class="filter">
        <label>Condición</label>
        <select [(ngModel)]="conditionFilter">
          <option value="">Todas</option>
          <option value="nuevo">Nuevo</option>
          <option value="usado">Usado</option>
          <option value="reparado">Reparado</option>
        </select>
      </div>

      <div class="filter">
        <label>Estado</label>
        <select [(ngModel)]="activeFilter">
          <option value="">Todos</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <button class="btn light" (click)="clearFilters()">Limpiar</button>
    </section>

    <section class="layout">
      <div class="grid-card">
        <table>
          <thead>
            <tr>
              <th class="col-no">No.</th>
              <th (click)="sortBy('created_at')">Fecha {{ sortIcon('created_at') }}</th>
              <th>Imagen</th>
              <th (click)="sortBy('sku')">SKU {{ sortIcon('sku') }}</th>
              <th (click)="sortBy('name')">Producto {{ sortIcon('name') }}</th>
              <th>Clasificación</th>
              <th>Automotriz</th>
              <th>Precios</th>
              <th>Existencias</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filteredProducts(); let i = index"
                [class]="rowStatusClass(p)"
                (click)="selected.set(p)">
              <td class="col-no">{{ i + 1 }}</td>
              <td>{{ productDate(p) }}</td>
              <td><div class="img">{{ p.product_type === 'motor' ? '⚙️' : '📦' }}</div></td>
              <td><strong>{{ p.sku }}</strong></td>
              <td>
                <strong>{{ p.name }}</strong>
                <div class="muted">{{ p.short_name || 'Sin nombre corto' }}</div>
                <span class="chip" *ngFor="let tag of tagList(p.characteristic_tags)">{{ tag }}</span>
              </td>
              <td>
                {{ categoryName(p.product_category_id || p.category_id) }}
                <div class="muted">{{ p.condition }} · {{ p.unit }}</div>
              </td>
              <td>
                Serie: {{ seriesName(p.engine_series_id) }}
                <div class="muted">{{ p.fuel_type || '—' }} · {{ p.displacement_cc || '—' }} cc</div>
              </td>
              <td>
                Q {{ money(p.price_sale) }}
                <div class="muted">Oferta Q {{ money(p.price_offer) }}</div>
              </td>
              <td>
                Disponible: <strong>{{ productStock(p.id).available }}</strong>
                <div class="muted">Físico {{ productStock(p.id).physical }} · Contable {{ productStock(p.id).accounting }}</div>
              </td>
              <td>
                <span class="chip">{{ stockAlertLabel(p) }}</span>
              </td>
              <td>
                <button class="btn light" (click)="editProduct(p); $event.stopPropagation()">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside class="panel" *ngIf="selected(); else emptyPanel">
        <h3>Resumen del producto</h3>
        <p><strong>{{ selected()?.sku }}</strong><br>{{ selected()?.name }}</p>
        <div class="panel-row"><span>Fecha</span><strong>{{ productDate(selected()) }}</strong></div>
        <div class="panel-row"><span>Categoría</span><strong>{{ categoryName(selected()?.product_category_id || selected()?.category_id) }}</strong></div>
        <div class="panel-row"><span>Serie motor</span><strong>{{ seriesName(selected()?.engine_series_id) }}</strong></div>
        <div class="panel-row"><span>Disponible</span><strong>{{ productStock(selected()?.id).available }}</strong></div>
        <div class="panel-row"><span>Stock mínimo</span><strong>{{ selected()?.stock_min || 0 }}</strong></div>
        <div class="panel-row"><span>Lotes</span><strong>{{ productLots(selected()?.id).length }}</strong></div>
        <div class="panel-row"><span>OEM</span><strong>{{ selected()?.oem_primary || '—' }}</strong></div>
        <button class="btn primary" (click)="editProduct(selected())">Editar producto</button>
      </aside>

      <ng-template #emptyPanel>
        <aside class="panel">
          <h3>Resumen lateral</h3>
          <p class="muted">Seleccioná un producto para ver existencias, lotes, serie, categoría y auditoría básica.</p>
        </aside>
      </ng-template>
    </section>

    <section class="drawer" *ngIf="drawerOpen()">
      <div class="drawer-body">
        <section class="page-head">
          <div>
            <div class="muted">CRUD maestro</div>
            <h2>{{ editingId ? 'Editar producto' : 'Nuevo producto' }}</h2>
          </div>
          <button class="btn light" (click)="closeDrawer()">Cerrar</button>
        </section>

        <div class="form-grid">
          <label>SKU <input [(ngModel)]="form.sku" /></label>
          <label>Nombre <input [(ngModel)]="form.name" /></label>
          <label>Nombre corto <input [(ngModel)]="form.short_name" /></label>

          <label>Categoría producto
            <select [(ngModel)]="form.product_category_id">
              <option [ngValue]="null">—</option>
              <option *ngFor="let c of productCategories()" [ngValue]="c.id">{{ c.name }}</option>
            </select>
          </label>

          <label>Serie motor
            <select [(ngModel)]="form.engine_series_id" (change)="applySeries()">
              <option [ngValue]="null">—</option>
              <option *ngFor="let s of series()" [ngValue]="s.id">{{ s.code }} · {{ s.name }}</option>
            </select>
          </label>

          <label>Condición
            <select [(ngModel)]="form.condition">
              <option value="nuevo">Nuevo</option>
              <option value="usado">Usado</option>
              <option value="reparado">Reparado</option>
            </select>
          </label>

          <label>Precio venta <input type="number" [(ngModel)]="form.price_sale" (change)="syncOfferFromSale()" /></label>
          <label>Precio oferta <input type="number" [(ngModel)]="form.price_offer" (change)="syncSaleFromOffer()" /></label>
          <label>Stock mínimo <input type="number" [(ngModel)]="form.stock_min" /></label>

          <label>Características
            <input [(ngModel)]="form.characteristic_tags" placeholder="Turbo, automático, completo..." />
          </label>

          <label>OEM principal <input [(ngModel)]="form.oem_primary" /></label>
          <label>Combustible <input [(ngModel)]="form.fuel_type" /></label>
          <label>C.C. <input [(ngModel)]="form.displacement_cc" /></label>
          <label>Cilindros <input [(ngModel)]="form.cylinders" /></label>
        </div>

        <label>Descripción
          <textarea rows="4" [(ngModel)]="form.description"></textarea>
        </label>

        <p>
          <label>
            <input type="checkbox" [(ngModel)]="form.is_active" />
            Activo
          </label>
        </p>

        <div class="actions">
          <button class="btn light" (click)="closeDrawer()">Cancelar</button>
          <button class="btn primary" (click)="saveProduct()">Guardar</button>
        </div>
      </div>
    </section>
  `
})
export class InventoryProductsComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  products = signal<any[]>([]);
  lots = signal<any[]>([]);
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);
  series = signal<any[]>([]);
  characteristics = signal<any[]>([]);

  selected = signal<any | null>(null);
  drawerOpen = signal(false);

  search = '';
  productCategoryFilter = '';
  seriesFilter = '';
  characteristicFilter = '';
  conditionFilter = '';
  activeFilter = '';

  sortKey = 'created_at';
  sortDir: 1 | -1 = -1;

  editingId: number | null = null;
  form: any = this.blank();

  productCategories = computed(() =>
    this.categories().filter(c => c.category_kind !== 'principal')
  );

  filteredProducts = computed(() => {
    const term = this.search.trim().toLowerCase();

    const rows = this.products().filter(p => {
      const text = [
        p.sku,
        p.name,
        p.short_name,
        p.description,
        p.oem_primary,
        p.oem_compatible_codes,
        p.fuel_type,
        p.displacement_cc,
        p.cylinders,
        this.seriesName(p.engine_series_id),
        this.categoryName(p.product_category_id || p.category_id),
        p.characteristic_tags
      ].join(' ').toLowerCase();

      if (term && !text.includes(term)) return false;
      if (this.productCategoryFilter && String(p.product_category_id || p.category_id) !== String(this.productCategoryFilter)) return false;
      if (this.seriesFilter && String(p.engine_series_id) !== String(this.seriesFilter)) return false;
      if (this.characteristicFilter && !this.tagList(p.characteristic_tags).includes(this.characteristicFilter)) return false;
      if (this.conditionFilter && p.condition !== this.conditionFilter) return false;
      if (this.activeFilter === 'active' && !p.is_active) return false;
      if (this.activeFilter === 'inactive' && p.is_active) return false;

      return true;
    });

    return rows.sort((a, b) => this.compareRows(a, b) * this.sortDir);
  });

  constructor() {
    this.loadAll();
    this.route.queryParamMap.subscribe(params => {
      if (params.get('create') === '1') this.newProduct();
    });
  }

  loadAll() {
    this.http.get<any[]>(`${API}/products`).subscribe(v => this.products.set(v));
    this.http.get<any[]>(`${API}/lots`).subscribe(v => this.lots.set(v));
    this.http.get<any[]>(`${API}/categories`).subscribe(v => this.categories.set(v));
    this.http.get<any[]>(`${API}/brands`).subscribe(v => this.brands.set(v));
    this.http.get<any[]>(`${API}/engine-series`).subscribe(v => this.series.set(v));
    this.http.get<any[]>(`${API}/characteristics`).subscribe(v => this.characteristics.set(v));
  }

  blank() {
    return {
      sku: '',
      name: '',
      short_name: '',
      product_type: 'repuesto',
      inventory_mode: 'inventariable',
      condition: 'nuevo',
      product_category_id: null,
      category_id: null,
      engine_series_id: null,
      unit: 'unidad',
      fuel_type: '',
      displacement_cc: '',
      cylinders: '',
      oem_primary: '',
      oem_compatible_codes: '',
      price_sale: 0,
      offer_discount_percent: 10,
      price_offer: 0,
      prices_linked: true,
      stock_min: 1,
      description: '',
      characteristic_tags: '',
      is_active: true
    };
  }

  newProduct() {
    this.editingId = null;
    this.form = this.blank();
    this.drawerOpen.set(true);
  }

  editProduct(p: any) {
    this.editingId = p.id;
    this.form = { ...this.blank(), ...p };
    this.drawerOpen.set(true);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  saveProduct() {
    this.form.category_id = this.form.product_category_id;
    const req = this.editingId
      ? this.http.put(`${API}/products/${this.editingId}`, this.form)
      : this.http.post(`${API}/products`, this.form);

    req.subscribe({
      next: () => {
        this.loadAll();
        this.closeDrawer();
      },
      error: e => alert(e?.error?.detail || 'No se pudo guardar producto')
    });
  }

  applySeries() {
    const s = this.series().find(x => Number(x.id) === Number(this.form.engine_series_id));
    if (!s) return;
    this.form.fuel_type = s.fuel_type;
    this.form.displacement_cc = s.displacement_cc;
    this.form.cylinders = s.cylinders;
    if (!this.form.sku && s.sku_prefix) this.form.sku = `${s.sku_prefix}`.toUpperCase() + '-';
  }

  syncOfferFromSale() {
    if (!this.form.prices_linked) return;
    const sale = Number(this.form.price_sale || 0);
    const discount = Number(this.form.offer_discount_percent || 0);
    this.form.price_offer = Number((sale - (sale * discount / 100)).toFixed(2));
  }

  syncSaleFromOffer() {
    if (!this.form.prices_linked) return;
    const offer = Number(this.form.price_offer || 0);
    const discount = Number(this.form.offer_discount_percent || 0);
    this.form.price_sale = Number((offer * (1 + discount / 100)).toFixed(2));
  }

  activeCount() {
    return this.products().filter(p => p.is_active).length;
  }

  productLots(id: any) {
    return this.lots().filter(l => Number(l.product_id) === Number(id));
  }

  productStock(id: any) {
    const lots = this.productLots(id);
    return {
      physical: lots.reduce((a, l) => a + Number(l.physical_qty || 0), 0),
      accounting: lots.reduce((a, l) => a + Number(l.accounting_qty || 0), 0),
      available: lots.reduce((a, l) => a + Number(l.available_physical || 0), 0)
    };
  }

  totalAvailable() {
    return this.lots().reduce((a, l) => a + Number(l.available_physical || 0), 0);
  }

  tagList(value: any) {
    return String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  }

  categoryName(id: any) {
    return this.categories().find(c => Number(c.id) === Number(id))?.name || '—';
  }

  seriesName(id: any) {
    const s = this.series().find(x => Number(x.id) === Number(id));
    return s ? `${s.code}` : '—';
  }

  money(value: any) {
    return Number(value || 0).toFixed(2);
  }

  clearFilters() {
    this.search = '';
    this.productCategoryFilter = '';
    this.seriesFilter = '';
    this.characteristicFilter = '';
    this.conditionFilter = '';
    this.activeFilter = '';
  }

  sortBy(key: string) {
    if (this.sortKey === key) this.sortDir = this.sortDir === 1 ? -1 : 1;
    else {
      this.sortKey = key;
      this.sortDir = key === 'created_at' ? -1 : 1;
    }
  }

  compareRows(a: any, b: any) {
    const av = a[this.sortKey] ?? '';
    const bv = b[this.sortKey] ?? '';

    if (this.sortKey.includes('date') || this.sortKey.includes('created')) {
      return (new Date(av || 0).getTime() || 0) - (new Date(bv || 0).getTime() || 0);
    }

    return String(av).localeCompare(String(bv), undefined, { numeric: true });
  }

  productDate(p: any) {
    const raw = p?.created_at || p?.createdAt || p?.updated_at || p?.date_created;
    if (!raw) return '—';
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? String(raw).slice(0, 10) : date.toLocaleDateString('es-GT');
  }

  rowStatusClass(p: any) {
    const stock = this.productStock(p.id);

    if (!p.is_active || p.inventory_mode === 'fuera_inventario' || stock.available <= 0) {
      return 'row-danger';
    }

    if (Number(p.stock_min || 0) > 0 && stock.available <= Number(p.stock_min || 0)) {
      return 'row-warning';
    }

    if (stock.available > Number(p.stock_min || 0)) {
      return 'row-success';
    }

    return 'row-neutral';
  }

  stockAlertLabel(p: any) {
    const stock = this.productStock(p.id);

    if (!p.is_active) return 'Inactivo';
    if (p.inventory_mode === 'fuera_inventario') return 'Fuera de inventario';
    if (stock.available <= 0) return 'Sin stock';
    if (Number(p.stock_min || 0) > 0 && stock.available <= Number(p.stock_min || 0)) return 'Stock mínimo';

    return 'Disponible';
  }

  sortIcon(key: string) {
    return this.sortKey === key ? (this.sortDir === 1 ? '↑' : '↓') : '';
  }

  exportCsv() {
    const header = ['SKU', 'Producto', 'Categoría', 'Serie', 'OEM', 'Precio', 'Disponible', 'Estado'];
    const rows = this.filteredProducts().map(p => [
      p.sku,
      p.name,
      this.categoryName(p.product_category_id || p.category_id),
      this.seriesName(p.engine_series_id),
      p.oem_primary,
      p.price_sale,
      this.productStock(p.id).available,
      this.stockAlertLabel(p)
    ]);

    this.download('productos.csv', [header, ...rows]);
  }

  download(name: string, rows: any[][]) {
    const csv = rows
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = name;
    link.click();
  }
}
