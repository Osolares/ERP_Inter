import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/inventory';

type ColumnKey = 'no'|'date'|'img'|'sku'|'name'|'classification'|'automotive'|'oem'|'prices'|'stock'|'lots'|'costs'|'status'|'notes'|'actions';
type Column = { key: ColumnKey; label: string; default: boolean; sort?: string };
const COLUMNS: Column[] = [
  { key:'no', label:'No.', default:true }, { key:'date', label:'Fecha', default:true, sort:'created_at' },
  { key:'img', label:'Imagen', default:true }, { key:'sku', label:'SKU', default:true, sort:'sku' },
  { key:'name', label:'Producto', default:true, sort:'name' }, { key:'classification', label:'Clasificación', default:true },
  { key:'automotive', label:'Automotriz', default:true }, { key:'oem', label:'OEM', default:true },
  { key:'prices', label:'Precios', default:true, sort:'price_sale' }, { key:'stock', label:'Existencias', default:true },
  { key:'lots', label:'Lotes', default:true }, { key:'costs', label:'Costos', default:true },
  { key:'status', label:'Estado', default:true }, { key:'notes', label:'Notas', default:false }, { key:'actions', label:'Acciones', default:true }
];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header inventory-hero">
      <div><span class="eyebrow">📦 Inventario · Productos</span><h1>Productos</h1><p>Tabla principal extensa con CRUD, filtros combinables, columnas configurables y resumen real de lotes.</p></div>
      <div class="hero-actions"><button class="btn" (click)="loadAll()">🔄 Actualizar</button><button class="btn" (click)="exportCsv()">📤 CSV</button><button class="btn" (click)="openConfig.set(!openConfig())">⚙️ Columnas</button><button class="btn primary wide-auto" (click)="newProduct()">➕ Nuevo producto</button></div>
    </div>

    <section class="alert-card"><strong>Regla protegida:</strong> producto maestro no guarda stock ni costo real. Esta vista solo muestra resúmenes calculados desde lotes.</section>

    <section class="metric-grid pro-metrics">
      <article class="metric"><span>🧩 Productos</span><strong>{{ products().length }}</strong></article>
      <article class="metric"><span>✅ Activos</span><strong>{{ activeCount() }}</strong></article>
      <article class="metric"><span>⏸ Inactivos</span><strong>{{ inactiveCount() }}</strong></article>
      <article class="metric"><span>🏷️ Lotes</span><strong>{{ lots().length }}</strong></article>
      <article class="metric"><span>📦 Disponible</span><strong>{{ totalAvailable() }}</strong></article>
    </section>

    <section class="card" *ngIf="openConfig()">
      <div class="table-header"><div><h3>⚙️ Columnas visibles</h3><p class="muted">Configuración local de la vista. Luego quedará sincronizada con Configuración global.</p></div><button class="btn" (click)="resetColumns()">Restablecer</button></div>
      <div class="column-grid"><label class="check pill" *ngFor="let c of columns"><input type="checkbox" [checked]="visible()[c.key]" (change)="toggleColumn(c.key)" /> {{ c.label }}</label></div>
    </section>

    <section class="card">
      <div class="filters-row extended-filters">
        <input [(ngModel)]="search" placeholder="Buscar SKU, nombre, OEM, serie, notas..." />
        <select [(ngModel)]="mainCategoryFilter"><option value="">Categoría principal</option><option *ngFor="let c of mainCategories()" [value]="c.id">{{ c.name }}</option></select>
        <select [(ngModel)]="productCategoryFilter"><option value="">Categoría producto</option><option *ngFor="let c of productCategories()" [value]="c.id">{{ c.name }}</option></select>
        <select [(ngModel)]="brandFilter"><option value="">Marca</option><option *ngFor="let b of brands()" [value]="b.id">{{ b.name }}</option></select>
        <select [(ngModel)]="seriesFilter"><option value="">Serie motor</option><option *ngFor="let s of series()" [value]="s.id">{{ s.code }} · {{ s.name }}</option></select>
        <select [(ngModel)]="characteristicFilter"><option value="">Características</option><option *ngFor="let c of characteristics()" [value]="c.name">{{ c.name }}</option></select>
        <select [(ngModel)]="conditionFilter"><option value="">Condición</option><option value="nuevo">Nuevo</option><option value="usado">Usado</option><option value="reparado">Reparado</option></select>
        <select [(ngModel)]="activeFilter"><option value="">Estado</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select>
        <button class="btn" (click)="clearFilters()">🧹 Limpiar</button>
      </div>
      <div class="table-wrap ultra-wide-table">
        <table>
          <thead><tr>
            <th *ngIf="isVisible('no')" class="col-no">No.</th><th *ngIf="isVisible('date')" (click)="sortBy('created_at')" class="col-date">Fecha {{ sortIcon('created_at') }}</th><th *ngIf="isVisible('img')">Imagen</th><th *ngIf="isVisible('sku')" (click)="sortBy('sku')">SKU {{ sortIcon('sku') }}</th><th *ngIf="isVisible('name')" (click)="sortBy('name')">Producto {{ sortIcon('name') }}</th>
            <th *ngIf="isVisible('classification')">Clasificación</th><th *ngIf="isVisible('automotive')">Automotriz</th><th *ngIf="isVisible('oem')">OEM</th><th *ngIf="isVisible('prices')" (click)="sortBy('price_sale')">Precios {{ sortIcon('price_sale') }}</th>
            <th *ngIf="isVisible('stock')">Existencias</th><th *ngIf="isVisible('lots')">Lotes</th><th *ngIf="isVisible('costs')">Costos</th><th *ngIf="isVisible('status')">Estado</th><th *ngIf="isVisible('notes')">Notas</th><th *ngIf="isVisible('actions')">Acciones</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let p of filteredProducts(); let i = index" [class.selected]="selected()?.id===p.id" [ngClass]="rowStatusClass(p)" (click)="selected.set(p)">
              <td *ngIf="isVisible('no')" class="col-no">{{ i + 1 }}</td>
              <td *ngIf="isVisible('date')" class="col-date">{{ productDate(p) }}</td>
              <td *ngIf="isVisible('img')" class="sticky-img"><div class="thumb">{{ p.product_type === 'motor' ? '🚗' : '🏷️' }}</div></td>
              <td *ngIf="isVisible('sku')"><strong>{{ p.sku }}</strong><br><small>{{ p.short_name || 'Sin nombre corto' }}</small></td>
              <td *ngIf="isVisible('name')" class="min-name"><strong>{{ p.name }}</strong><br><small>{{ p.description || 'Sin descripción' }}</small></td>
              <td *ngIf="isVisible('classification')">{{ categoryName(p.main_category_id) }}<br><strong>{{ categoryName(p.product_category_id || p.category_id) }}</strong><br><small>{{ p.condition }} · {{ p.unit }}</small></td>
              <td *ngIf="isVisible('automotive')">Serie: <strong>{{ seriesName(p.engine_series_id) }}</strong><br>{{ p.fuel_type || '—' }} · {{ p.displacement_cc || '—' }} cc · {{ p.cylinders || '—' }} cil.<br><small>{{ p.compatible_brand || '—' }} {{ p.compatible_model || '' }}</small></td>
              <td *ngIf="isVisible('oem')"><strong>{{ p.oem_primary || '—' }}</strong><br><small>{{ p.oem_compatible_codes || 'Sin equivalentes' }}</small></td>
              <td *ngIf="isVisible('prices')">Venta: <strong>Q {{ money(p.price_sale) }}</strong><br>Oferta: Q {{ money(p.price_offer) }}<br><small>{{ p.prices_linked ? 'Vinculado' : 'Manual' }} · {{ p.offer_discount_percent }}%</small></td>
              <td *ngIf="isVisible('stock')">Físico: <strong>{{ productStock(p.id).physical }}</strong><br>Contable: <strong>{{ productStock(p.id).accounting }}</strong><br>Disponible: <strong>{{ productStock(p.id).available }}</strong></td>
              <td *ngIf="isVisible('lots')">{{ productLots(p.id).length }} lotes<br><small>{{ lotsOutAccounting(p.id) }} fuera contable · {{ lotsDisassemblable(p.id) }} desarmables</small></td>
              <td *ngIf="isVisible('costs')">Último: Q {{ money(lastCost(p.id)) }}<br><small>Promedio: Q {{ money(avgCost(p.id)) }}</small></td>
              <td *ngIf="isVisible('status')"><span class="status-pill" [class.status-ok]="p.is_active" [class.status-void]="!p.is_active">{{ p.is_active ? 'Activo' : 'Inactivo' }}</span><br><small>{{ p.inventory_mode }}</small><br><small>{{ stockAlertLabel(p) }}</small></td>
              <td *ngIf="isVisible('notes')"><small>{{ p.internal_notes || p.sale_notes || '—' }}</small></td>
              <td *ngIf="isVisible('actions')" class="row-actions"><button class="btn small" (click)="$event.stopPropagation(); editProduct(p)">✏️</button><button class="btn small" (click)="$event.stopPropagation(); duplicateProduct(p)">⧉</button><button class="btn small" (click)="$event.stopPropagation(); quickLot(p)">🏷️ Lote</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="detail-drawer card erp-side-panel" *ngIf="selected() && !drawerOpen()">
      <div class="table-header"><div><h3>📌 Resumen lateral</h3><p class="muted">{{ selected()?.sku }} · {{ selected()?.name }}</p></div><button class="btn" (click)="selected.set(null)">Cerrar</button></div>
      <div class="side-panel-grid">
        <div><span>Fecha creación</span><strong>{{ productDate(selected()) }}</strong></div>
        <div><span>Categoría</span><strong>{{ categoryName(selected()?.product_category_id || selected()?.category_id) }}</strong></div>
        <div><span>Serie motor</span><strong>{{ seriesName(selected()?.engine_series_id) }}</strong></div>
        <div><span>Disponible</span><strong>{{ productStock(selected()?.id).available }}</strong></div>
        <div><span>Físico</span><strong>{{ productStock(selected()?.id).physical }}</strong></div>
        <div><span>Contable</span><strong>{{ productStock(selected()?.id).accounting }}</strong></div>
        <div><span>Lotes</span><strong>{{ productLots(selected()?.id).length }}</strong></div>
        <div><span>Stock mínimo</span><strong>{{ selected()?.stock_min || 0 }}</strong></div>
        <div><span>OEM</span><strong>{{ selected()?.oem_primary || '—' }}</strong></div>
        <div><span>Características</span><strong>{{ selected()?.characteristic_tags || '—' }}</strong></div>
      </div>
      <div class="related-list" *ngIf="productLots(selected()?.id).length"><strong>Lotes relacionados</strong><button type="button" class="related-item" *ngFor="let l of productLots(selected()?.id).slice(0,5)">{{ l.lot_code }} · disponible {{ l.available_physical || 0 }} · Q {{ money(l.unit_cost) }}</button></div>
      <div class="quick-actions"><button class="btn" (click)="editProduct(selected())">✏️ Editar</button><button class="btn" (click)="quickLot(selected())">🏷️ Crear lote</button><a class="btn" href="/multimedia">📷 Fotos</a><a class="btn" href="/automotive">🚗 Automotriz</a></div>
    </section>

    <div class="drawer-backdrop" *ngIf="drawerOpen()" (click)="closeDrawer()"></div>
    <aside class="product-drawer" *ngIf="drawerOpen()">
      <div class="drawer-head"><div><h2>{{ editingId ? 'Editar producto' : 'Nuevo producto' }}</h2><p>CRUD principal de productos. Campos heredados de v13, ordenados para v16.</p></div><button class="btn icon" (click)="closeDrawer()">×</button></div>
      <div class="drawer-tabs"><button *ngFor="let t of tabs" [class.active]="tab()===t.key" (click)="tab.set(t.key)">{{ t.label }}</button></div>
      <div class="drawer-body">
        <section *ngIf="tab()==='general'">
          <h3>📄 General</h3>
          <div class="form-grid"><label>SKU<input [(ngModel)]="form.sku"></label><label>Nombre<input [(ngModel)]="form.name"></label><label>Nombre corto<input [(ngModel)]="form.short_name"></label><label>Características / tipo<div class="inline-add"><select [(ngModel)]="selectedCharacteristic"><option value="">Seleccionar...</option><option *ngFor="let c of characteristics()" [value]="c.name">{{c.name}}</option></select><button class="btn small" (click)="addCharacteristicTag()">＋</button></div></label></div><div class="chip-list"><span class="chip" *ngFor="let c of tagList(form.characteristic_tags)">{{c}} <button class="chip-x" (click)="removeCharacteristicTag(c)">×</button></span></div>
          <div class="form-grid"><label>Categoría principal<div class="inline-add"><select [(ngModel)]="form.main_category_id"><option [ngValue]="null">—</option><option *ngFor="let c of mainCategories()" [ngValue]="c.id">{{ c.name }}</option></select><button class="btn small" (click)="quickAddCategory('principal')">＋</button></div></label><label>Categoría producto<div class="inline-add"><select [(ngModel)]="form.product_category_id"><option [ngValue]="null">—</option><option *ngFor="let c of productCategories()" [ngValue]="c.id">{{ c.name }}</option></select><button class="btn small" (click)="quickAddCategory('producto')">＋</button></div></label><label>Condición<select [(ngModel)]="form.condition"><option value="nuevo">Nuevo</option><option value="usado">Usado</option><option value="reparado">Reparado</option></select></label><label>Unidad<input [(ngModel)]="form.unit"></label></div>
          <div class="section-title">Estado operativo</div><div class="switch-row switch-row-pro"><label class="switch-pill"><input type="checkbox" [(ngModel)]="form.is_active"><span>Activo</span></label><label class="switch-pill"><input type="checkbox" [checked]="form.inventory_mode==='inventariable'" (change)="form.inventory_mode=$any($event.target).checked?'inventariable':'fuera_inventario'"><span>Producto inventariable</span></label></div>
          <div class="section-title">Descripción y notas</div><div class="form-grid one-col"><label>Descripción<textarea [(ngModel)]="form.description"></textarea></label><label>Comentarios internos<textarea [(ngModel)]="form.internal_notes"></textarea></label><label>Notas de venta<textarea [(ngModel)]="form.sale_notes"></textarea></label></div>
        </section>
        <section *ngIf="tab()==='automotive'">
          <h3>🚗 Automotriz</h3>
          <div class="form-grid"><label>Serie motor<div class="inline-add"><select [(ngModel)]="form.engine_series_id" (change)="applySeries()"><option [ngValue]="null">—</option><option *ngFor="let s of series()" [ngValue]="s.id">{{ s.code }} · {{ s.name }}</option></select><button class="btn small" (click)="quickAddSeries()">＋</button></div></label><label>Combustible<input [(ngModel)]="form.fuel_type"></label><label>C.C.<input [(ngModel)]="form.displacement_cc"></label><label>Cilindros<input [(ngModel)]="form.cylinders"></label><label>OEM principal<input [(ngModel)]="form.oem_primary"></label></div>
          <div class="section-title">Compatibilidades y equivalencias</div><div class="form-grid"><label>Marca compatible<div class="inline-add"><select [(ngModel)]="form.brand_id"><option [ngValue]="null">—</option><option *ngFor="let b of brands()" [ngValue]="b.id">{{ b.name }}</option></select><button class="btn small" (click)="quickAddBrand()">＋</button></div></label><label>Modelo compatible<input [(ngModel)]="form.compatible_model"></label><label>Año desde<input [(ngModel)]="form.year_from"></label><label>Año hasta<input [(ngModel)]="form.year_to"></label><label>OEM compatibles<textarea [(ngModel)]="form.oem_compatible_codes"></textarea></label><label>Series compatibles<textarea [(ngModel)]="form.compatible_engine_series_tags"></textarea></label></div>
        </section>
        <section *ngIf="tab()==='prices'"><h3>💲 Precios</h3><label class="check"><input type="checkbox" [(ngModel)]="form.prices_linked"> Vincular precio venta/oferta</label><div class="form-grid"><label>Precio venta<input type="number" [(ngModel)]="form.price_sale" (input)="syncOfferFromSale()"></label><label>% descuento<input type="number" [(ngModel)]="form.offer_discount_percent" (input)="syncOfferFromSale()"></label><label>Precio oferta<input type="number" [(ngModel)]="form.price_offer" (input)="syncSaleFromOffer()"></label><label>Mayorista<input type="number" [(ngModel)]="form.price_wholesale"></label><label>Mínimo autorizado<input type="number" [(ngModel)]="form.price_min_authorized"></label><label>Stock mínimo<input type="number" [(ngModel)]="form.stock_min"></label></div></section>
        <section *ngIf="tab()==='photos'"><h3>📷 Fotos</h3><p class="muted">Las fotos se gestionan desde el Motor Multimedia reutilizable.</p><a class="btn" href="/multimedia">Abrir Multimedia / Etiquetas</a></section>
        <section *ngIf="tab()==='relations'"><h3>🔗 Relacionado</h3><div class="rules-grid"><div><strong>Lotes</strong><p>{{ editingId ? productLots(editingId).length : 0 }} lotes relacionados.</p></div><div><strong>Kardex</strong><p>Los movimientos siguen viviendo en Kardex, no en el producto.</p></div><div><strong>Documentos</strong><p>Compras, salidas y facturas se conectan por lote.</p></div></div></section>
      </div>
      <div class="drawer-footer"><button class="btn" (click)="closeDrawer()">Cancelar</button><button class="btn primary wide-auto" (click)="saveProduct()">💾 Guardar</button></div>
    </aside>
  `
})
export class InventoryProductsComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  products = signal<any[]>([]); lots = signal<any[]>([]); categories = signal<any[]>([]); brands = signal<any[]>([]); series = signal<any[]>([]); characteristics = signal<any[]>([]);
  selected = signal<any|null>(null); drawerOpen = signal(false); openConfig = signal(false); tab = signal('general');
  columns = COLUMNS; visible = signal<Record<ColumnKey, boolean>>(this.readColumns());
  selectedCharacteristic=''; search=''; mainCategoryFilter=''; productCategoryFilter=''; brandFilter=''; seriesFilter=''; characteristicFilter=''; conditionFilter=''; activeFilter=''; sortKey='created_at'; sortDir: 1|-1 = -1;
  editingId:number|null=null; tabs=[{key:'general',label:'📄 General'},{key:'automotive',label:'🚗 Automotriz'},{key:'prices',label:'💲 Precios'},{key:'photos',label:'📷 Fotos'},{key:'relations',label:'🔗 Relacionado'}];
  form:any=this.blank();
  mainCategories=computed(()=>this.categories().filter(c=>c.category_kind==='principal'));
  productCategories=computed(()=>this.categories().filter(c=>c.category_kind!=='principal'));
  filteredProducts=computed(()=>{
    const term=this.search.trim().toLowerCase();
    let rows=this.products().filter(p=>{
      const txt=[p.sku,p.name,p.short_name,p.description,p.oem_primary,p.oem_compatible_codes,p.fuel_type,p.displacement_cc,p.cylinders,this.seriesName(p.engine_series_id),this.categoryName(p.main_category_id),this.categoryName(p.product_category_id)].join(' ').toLowerCase();
      if(term && !txt.includes(term)) return false;
      if(this.mainCategoryFilter && String(p.main_category_id)!==String(this.mainCategoryFilter)) return false;
      if(this.productCategoryFilter && String(p.product_category_id||p.category_id)!==String(this.productCategoryFilter)) return false;
      if(this.brandFilter && String(p.brand_id)!==String(this.brandFilter)) return false;
      if(this.seriesFilter && String(p.engine_series_id)!==String(this.seriesFilter)) return false;
      if(this.characteristicFilter && !this.tagList(p.characteristic_tags).includes(this.characteristicFilter)) return false;
      if(this.conditionFilter && p.condition!==this.conditionFilter) return false;
      if(this.activeFilter==='active' && !p.is_active) return false;
      if(this.activeFilter==='inactive' && p.is_active) return false;
      return true;
    });
    return rows.sort((a,b)=>this.compareRows(a,b)*this.sortDir);
  });
  constructor(){ this.loadAll(); this.route.queryParamMap.subscribe(params=>{ if(params.get('create')==='1') this.newProduct(); }); }
  loadAll(){ this.http.get<any[]>(`${API}/products`).subscribe(v=>this.products.set(v)); this.http.get<any[]>(`${API}/lots`).subscribe(v=>this.lots.set(v)); this.http.get<any[]>(`${API}/categories`).subscribe(v=>this.categories.set(v)); this.http.get<any[]>(`${API}/brands`).subscribe(v=>this.brands.set(v)); this.http.get<any[]>(`${API}/engine-series`).subscribe(v=>this.series.set(v)); this.http.get<any[]>(`${API}/characteristics`).subscribe(v=>this.characteristics.set(v)); }
  blank(){ return {sku:'',name:'',short_name:'',product_type:'repuesto',inventory_mode:'inventariable',condition:'nuevo',main_category_id:null,product_category_id:null,category_id:null,additional_category_ids:'',characteristic_tags:'',brand_id:null,engine_series_id:null,unit:'unidad',compatible_brand:'',compatible_model:'',year_from:'',year_to:'',fuel_type:'',displacement_cc:'',cylinders:'',oem_primary:'',oem_compatible_codes:'',compatible_engine_series_tags:'',price_sale:0,offer_discount_percent:10,price_offer:0,price_wholesale:0,price_min_authorized:0,prices_linked:true,stock_min:1,currency:'GTQ',tax_rate:12,description:'',internal_notes:'',sale_notes:'',is_active:true}; }
  newProduct(){ this.editingId=null; this.form=this.blank(); this.tab.set('general'); this.drawerOpen.set(true); }
  editProduct(p:any){ this.editingId=p.id; this.form={...this.blank(),...p}; this.tab.set('general'); this.drawerOpen.set(true); }
  duplicateProduct(p:any){ this.editingId=null; this.form={...this.blank(),...p,id:undefined,sku:`${p.sku}-COPIA`,name:`${p.name} (copia)`}; this.drawerOpen.set(true); }
  closeDrawer(){ this.drawerOpen.set(false); }
  saveProduct(){ this.form.category_id=this.form.product_category_id; const req=this.editingId?this.http.put(`${API}/products/${this.editingId}`,this.form):this.http.post(`${API}/products`,this.form); req.subscribe({next:()=>{this.loadAll(); this.closeDrawer();}, error:e=>alert(e?.error?.detail||'No se pudo guardar producto')}); }
  quickLot(p:any){ localStorage.setItem('erp_prefill_lot_product', JSON.stringify({id:p.id, sku:p.sku, name:p.name})); location.href='/inventory/lots'; }
  applySeries(){ const s=this.series().find(x=>Number(x.id)===Number(this.form.engine_series_id)); if(!s) return; this.form.fuel_type=s.fuel_type; this.form.displacement_cc=s.displacement_cc; this.form.cylinders=s.cylinders; if(!this.form.sku && s.sku_prefix) this.form.sku=s.sku_prefix.toUpperCase()+'-'; }

  tagList(v:any){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean);}
  addCharacteristicTag(){if(!this.selectedCharacteristic)return; const tags=this.tagList(this.form.characteristic_tags); if(!tags.includes(this.selectedCharacteristic)) tags.push(this.selectedCharacteristic); this.form.characteristic_tags=tags.join(', '); this.selectedCharacteristic='';}
  removeCharacteristicTag(tag:string){this.form.characteristic_tags=this.tagList(this.form.characteristic_tags).filter(x=>x!==tag).join(', ');}

  quickAddCategory(kind:string){ const name=prompt(`Nueva categoría ${kind}`); if(!name) return; this.http.post<any>(`${API}/categories`,{name,category_kind:kind,sku_prefix:name.substring(0,3).toUpperCase(),requires_engine_series:false,handles_inventory:true,description:''}).subscribe(()=>this.loadAll()); }
  quickAddBrand(){ const name=prompt('Nueva marca'); if(name) this.http.post(`${API}/brands`,{name}).subscribe(()=>this.loadAll()); }
  quickAddSeries(){ localStorage.setItem('erp_return_to_product_form', JSON.stringify(this.form)); location.href='/inventory/engine-series?create=1'; }
  syncOfferFromSale(){ if(!this.form.prices_linked) return; const sale=Number(this.form.price_sale||0), d=Number(this.form.offer_discount_percent||0); this.form.price_offer=Number((sale-(sale*d/100)).toFixed(2)); }
  syncSaleFromOffer(){ if(!this.form.prices_linked) return; const offer=Number(this.form.price_offer||0), d=Number(this.form.offer_discount_percent||0); this.form.price_sale=Number((offer*(1+d/100)).toFixed(2)); }
  activeCount(){ return this.products().filter(p=>p.is_active).length; }
  inactiveCount(){ return this.products().filter(p=>!p.is_active).length; }
  productLots(id:any){ return this.lots().filter(l=>Number(l.product_id)===Number(id)); }
  lotsOutAccounting(id:any){ return this.productLots(id).filter(l=>l.is_out_of_accounting_inventory).length; }
  lotsDisassemblable(id:any){ return this.productLots(id).filter(l=>l.is_disassemblable).length; }
  productStock(id:any){ const ls=this.productLots(id); return {physical:ls.reduce((a,l)=>a+Number(l.physical_qty||0),0), accounting:ls.reduce((a,l)=>a+Number(l.accounting_qty||0),0), available:ls.reduce((a,l)=>a+Number(l.available_physical||0),0)}; }
  totalAvailable(){ return this.lots().reduce((a,l)=>a+Number(l.available_physical||0),0); }
  lastCost(id:any){ const l=this.productLots(id).at(0); return l?.unit_cost||0; }
  avgCost(id:any){ const ls=this.productLots(id).filter(l=>Number(l.unit_cost)>0); return ls.length?ls.reduce((a,l)=>a+Number(l.unit_cost),0)/ls.length:0; }
  categoryName(id:any){ return this.categories().find(c=>Number(c.id)===Number(id))?.name||'—'; }
  seriesName(id:any){ const s=this.series().find(x=>Number(x.id)===Number(id)); return s?`${s.code}`:'—'; }
  money(v:any){ return Number(v||0).toFixed(2); }
  clearFilters(){ this.search=this.mainCategoryFilter=this.productCategoryFilter=this.brandFilter=this.seriesFilter=this.characteristicFilter=this.conditionFilter=this.activeFilter=''; }
  sortBy(k:string){ if(this.sortKey===k) this.sortDir=this.sortDir===1?-1:1; else {this.sortKey=k; this.sortDir=k==='created_at'?-1:1;} }
  compareRows(a:any,b:any){ const av=a[this.sortKey]??''; const bv=b[this.sortKey]??''; if(this.sortKey.includes('date')||this.sortKey.includes('created')) return (new Date(av||0).getTime()||0)-(new Date(bv||0).getTime()||0); return String(av).localeCompare(String(bv), undefined, {numeric:true}); }
  productDate(p:any){ const raw=p?.created_at||p?.createdAt||p?.updated_at||p?.date_created; if(!raw) return '—'; const d=new Date(raw); return Number.isNaN(d.getTime()) ? String(raw).slice(0,10) : d.toLocaleDateString('es-GT'); }
  rowStatusClass(p:any){ const st=this.productStock(p.id); if(!p.is_active || p.inventory_mode==='fuera_inventario' || st.available<=0) return 'row-danger'; if(Number(p.stock_min||0)>0 && st.available<=Number(p.stock_min||0)) return 'row-warning'; if(st.available>Number(p.stock_min||0)) return 'row-success'; return 'row-neutral'; }
  stockAlertLabel(p:any){ const st=this.productStock(p.id); if(!p.is_active) return 'Inactivo'; if(p.inventory_mode==='fuera_inventario') return 'Fuera de inventario'; if(st.available<=0) return 'Sin stock'; if(Number(p.stock_min||0)>0 && st.available<=Number(p.stock_min||0)) return 'Stock mínimo'; return 'Disponible'; }
  sortIcon(k:string){ return this.sortKey===k ? (this.sortDir===1?'↑':'↓') : ''; }
  isVisible(k:ColumnKey){ return !!this.visible()[k]; }
  toggleColumn(k:ColumnKey){ const next={...this.visible(),[k]:!this.visible()[k]}; this.visible.set(next); localStorage.setItem('erp_products_columns',JSON.stringify(next)); }
  resetColumns(){ localStorage.removeItem('erp_products_columns'); this.visible.set(this.readColumns()); }
  readColumns():Record<ColumnKey, boolean>{ try{ const s=JSON.parse(localStorage.getItem('erp_products_columns')||'{}'); return Object.fromEntries(COLUMNS.map(c=>[c.key,s[c.key]??c.default])) as any;}catch{return Object.fromEntries(COLUMNS.map(c=>[c.key,c.default])) as any;} }
  exportCsv(){ const h=['SKU','Producto','Categoria principal','Categoria producto','Serie','OEM','Precio','Disponible','Activo']; const rows=this.filteredProducts().map(p=>[p.sku,p.name,this.categoryName(p.main_category_id),this.categoryName(p.product_category_id),this.seriesName(p.engine_series_id),p.oem_primary,p.price_sale,this.productStock(p.id).available,p.is_active]); this.download('productos_detallados.csv',[h,...rows]); }
  download(name:string, rows:any[][]){ const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download=name; a.click(); }
}
