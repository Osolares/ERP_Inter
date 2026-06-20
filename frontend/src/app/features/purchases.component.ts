import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/inventory';

type Product = { id:number; sku:string; name:string; product_type:string; condition:string; price_sale:any; };
type Warehouse = { id:number; code:string; name:string; };
type Supplier = { id:number; name:string; tax_id:string; contact_name:string; phone:string; email:string; address:string; notes:string; is_active:boolean; };
type Purchase = { id:number; purchase_code:string; supplier_name:string; supplier_tax_id:string; warehouse_id:number|null; status:string; document_reference:string; subtotal:any; tax_total:any; total:any; notes:string; internal_notes:string; is_active:boolean; };
type PurchaseLine = { id:number; purchase_id:number; product_id:number; lot_id:number|null; warehouse_id:number|null; description:string; quantity:any; unit_cost_with_tax:any; line_total_with_tax:any; is_out_of_accounting_inventory:boolean; physical_before:any; physical_after:any; accounting_before:any; accounting_after:any; notes:string; };
type PurchaseFormLine = { product_id:number|null; warehouse_id:number|null; lot_code:string; quantity:number; unit_cost_with_tax:number; is_out_of_accounting_inventory:boolean; notes:string; };
type Alert = { type:'success'|'danger'|'warning'|'info'; title:string; message:string; detail?:string };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="purchase-hero">
      <div>
        <span class="eyebrow">📥 ERP v15.2.0 · Workspace Compras</span>
        <h1>Compras Profesional</h1>
        <p>Compra, proveedor, recepción, costos, lotes y Kardex en un solo centro de trabajo.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" [disabled]="loading()" (click)="loadAll()">🔄 Actualizar</button>
        <button class="btn primary wide-auto" type="button" (click)="tab.set('compra'); resetPurchaseForm()">➕ Nueva compra</button>
      </div>
    </section>

    <section class="purchase-toolbar">
      <button class="tool" [class.active]="tab()==='panel'" (click)="tab.set('panel')">📊 Panel</button>
      <button class="tool" [class.active]="tab()==='compra'" (click)="tab.set('compra')">📑 Documento</button>
      <button class="tool" [class.active]="tab()==='proveedores'" (click)="tab.set('proveedores')">🏢 Proveedores</button>
      <button class="tool" [class.active]="tab()==='recepcion'" (click)="tab.set('recepcion')">📦 Recepción</button>
      <button class="tool" [class.active]="tab()==='costos'" (click)="tab.set('costos')">💰 Costos</button>
      <button class="tool" (click)="printSummary()">🖨️ Resumen</button>
      <button class="tool" (click)="exportPurchasesCsv()">📤 Exportar CSV</button>
    </section>

    <section class="search-panel purchase-search">
      <div>
        <strong>🔎 Búsqueda de compras</strong>
        <p>Busca proveedor, NIT, documento, compra o estado sin cambiar de módulo.</p>
      </div>
      <input [(ngModel)]="search" placeholder="Buscar proveedor, NIT, factura, COMPRA..." />
    </section>

    <section class="purchase-kpis">
      <button class="kpi" (click)="tab.set('compra')"><span>Compras</span><strong>{{ purchases().length }}</strong><small>Documentos</small></button>
      <button class="kpi money" (click)="tab.set('costos')"><span>Total comprado</span><strong>Q {{ money(totalPurchased()) }}</strong><small>Registradas activas</small></button>
      <button class="kpi warning" (click)="tab.set('recepcion'); statusFilter='borrador'"><span>Borradores</span><strong>{{ draftPurchases().length }}</strong><small>Pendientes de registrar</small></button>
      <button class="kpi ok" (click)="tab.set('recepcion'); statusFilter='registrada'"><span>Registradas</span><strong>{{ registeredPurchases().length }}</strong><small>Con lote/Kardex</small></button>
      <button class="kpi danger" (click)="tab.set('compra'); statusFilter='anulada'"><span>Anuladas</span><strong>{{ voidPurchases().length }}</strong><small>Control</small></button>
      <button class="kpi" (click)="tab.set('proveedores')"><span>Proveedores</span><strong>{{ suppliers().length }}</strong><small>Base compras</small></button>
    </section>

    <section class="alert" *ngIf="alert()" [class.danger]="alert()?.type==='danger'" [class.success]="alert()?.type==='success'" [class.warning]="alert()?.type==='warning'">
      <strong>{{ alert()?.title }}</strong><span>{{ alert()?.message }}</span><small *ngIf="alert()?.detail">{{ alert()?.detail }}</small><button class="btn small" (click)="alert.set(null)">Cerrar</button>
    </section>

    <section class="purchase-grid" *ngIf="tab()==='panel'">
      <article class="card wide">
        <h3>⭐ Operaciones de compra</h3>
        <div class="ops-grid">
          <button class="ops" (click)="tab.set('recepcion'); statusFilter='borrador'">📑 <strong>{{ draftPurchases().length }}</strong><span>Borradores pendientes de recepción</span></button>
          <button class="ops" (click)="tab.set('costos')">💰 <strong>Q {{ money(avgCost()) }}</strong><span>Costo promedio por línea</span></button>
          <button class="ops" (click)="tab.set('proveedores')">🏢 <strong>{{ suppliersWithoutPhone() }}</strong><span>Proveedores sin teléfono</span></button>
          <button class="ops" (click)="tab.set('compra'); resetPurchaseForm()">➕ <strong>Nueva</strong><span>Compra local o importación base</span></button>
        </div>
      </article>
      <article class="card">
        <h3>⚡ Acciones rápidas</h3>
        <div class="action-list">
          <button class="btn primary wide-auto" (click)="tab.set('compra'); resetPurchaseForm()">📑 Nueva compra</button>
          <button class="btn" (click)="tab.set('recepcion'); statusFilter='borrador'">📦 Recibir borradores</button>
          <button class="btn" (click)="tab.set('proveedores')">🏢 Ver proveedores</button>
          <button class="btn" (click)="exportPurchasesCsv()">📤 Exportar compras</button>
        </div>
      </article>
      <article class="card wide">
        <h3>📋 Compras recientes</h3>
        <div class="table-wrap">
          <table><thead><tr><th>Código</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
            <tr *ngFor="let p of filteredPurchases().slice(0,10)" [class.selected]="selectedPurchase()?.id===p.id">
              <td><strong>{{ p.purchase_code }}</strong><br><small>{{ p.document_reference || 'Sin referencia' }}</small></td>
              <td>{{ p.supplier_name }}<br><small>{{ p.supplier_tax_id }}</small></td>
              <td><span class="status-pill" [ngClass]="statusClass(p.status)">{{ statusLabel(p.status) }}</span></td>
              <td>Q {{ money(p.total) }}</td>
              <td><button class="btn small" (click)="selectPurchase(p)">Ver</button><button class="btn small" (click)="printPurchase(p)">🖨️</button></td>
            </tr>
          </tbody></table>
        </div>
      </article>
      <aside class="card context-card">
        <ng-container *ngIf="selectedPurchase(); else noPurchase">
          <div class="context-avatar">📥</div>
          <h3>{{ selectedPurchase()?.purchase_code }}</h3>
          <p>{{ selectedPurchase()?.supplier_name }}</p>
          <span class="status-pill" [ngClass]="statusClass(selectedPurchase()?.status || '')">{{ statusLabel(selectedPurchase()?.status || '') }}</span>
          <div class="info-list"><span>Total</span><strong>Q {{ money(selectedPurchase()?.total) }}</strong><span>Líneas</span><strong>{{ selectedLines().length }}</strong><span>Referencia</span><strong>{{ selectedPurchase()?.document_reference || '—' }}</strong></div>
          <div class="quick-actions"><button class="btn small" (click)="printPurchase(selectedPurchase())">🖨️ Imprimir</button><button class="btn small" *ngIf="selectedPurchase()?.status==='borrador'" (click)="registerPurchase(selectedPurchase())">✅ Registrar</button><button class="btn small danger" *ngIf="selectedPurchase()?.status!=='anulada'" (click)="voidPurchase(selectedPurchase())">🚫 Anular</button></div>
        </ng-container>
        <ng-template #noPurchase><p class="muted">Selecciona una compra para ver su panel contextual, líneas y acciones disponibles.</p></ng-template>
      </aside>
    </section>

    <section class="purchase-main" *ngIf="tab()==='compra'">
      <article class="card purchase-document">
        <div class="table-header"><div><h3>{{ editingPurchaseId() ? '✏️ Editar borrador' : '📑 Nueva compra' }}</h3><p class="muted">Borrador no afecta inventario. Registrada crea lotes y Kardex.</p></div><button class="btn" (click)="resetPurchaseForm()">➕ Limpiar</button></div>
        <div class="form-grid">
          <label>Proveedor
            <input [(ngModel)]="purchaseForm.supplier_name" list="supplierNames" placeholder="Proveedor" />
            <datalist id="supplierNames"><option *ngFor="let s of suppliers()" [value]="s.name"></option></datalist>
          </label>
          <label>NIT<input [(ngModel)]="purchaseForm.supplier_tax_id" placeholder="CF" /></label>
          <label>Referencia documento<input [(ngModel)]="purchaseForm.document_reference" placeholder="Factura proveedor, póliza, guía..." /></label>
          <label>Estado
            <select [(ngModel)]="purchaseForm.status"><option value="borrador">Borrador</option><option value="registrada">Registrar al guardar</option></select>
          </label>
          <label>Bodega general
            <select [(ngModel)]="purchaseForm.warehouse_id"><option [ngValue]="null">Bodega por defecto</option><option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.code }} — {{ w.name }}</option></select>
          </label>
        </div>
        <div class="section-title">Líneas de compra</div>
        <div class="line-editor" *ngFor="let line of purchaseLines; let i=index">
          <label>Producto<select [(ngModel)]="line.product_id"><option [ngValue]="null">Seleccionar producto...</option><option *ngFor="let p of products()" [ngValue]="p.id">{{ p.sku }} — {{ p.name }}</option></select></label>
          <label>Cantidad<input type="number" min="1" [(ngModel)]="line.quantity" /></label>
          <label>Costo con IVA<input type="number" min="0" [(ngModel)]="line.unit_cost_with_tax" /></label>
          <label>Código lote<input [(ngModel)]="line.lot_code" placeholder="Auto" /></label>
          <label>Bodega<select [(ngModel)]="line.warehouse_id"><option [ngValue]="null">General</option><option *ngFor="let w of warehouses()" [ngValue]="w.id">{{ w.code }}</option></select></label>
          <label class="check"><input type="checkbox" [(ngModel)]="line.is_out_of_accounting_inventory" /> Fuera contable</label>
          <label class="line-notes">Notas<input [(ngModel)]="line.notes" /></label>
          <button class="btn small danger" (click)="removeLine(i)">✕</button>
        </div>
        <button class="btn" (click)="addLine()">➕ Agregar línea</button>
        <div class="document-totals"><span>Subtotal</span><strong>Q {{ money(purchaseSubtotal()) }}</strong><span>IVA</span><strong>Incluido en costo</strong><span>Total</span><strong>Q {{ money(purchaseSubtotal()) }}</strong></div>
        <div class="form-grid one-col"><label>Notas visibles<textarea [(ngModel)]="purchaseForm.notes"></textarea></label><label>Comentarios internos<textarea [(ngModel)]="purchaseForm.internal_notes"></textarea></label></div>
        <div class="drawer-footer inline-footer"><button class="btn" (click)="resetPurchaseForm()">Cancelar</button><button class="btn primary wide-auto" [disabled]="saving()" (click)="savePurchase()">💾 Guardar compra</button></div>
      </article>

      <aside class="card context-card">
        <h3>🧭 Reglas de compra</h3>
        <div class="rules-grid single">
          <div><strong>Borrador</strong><p>No crea lotes, no mueve inventario y no genera Kardex.</p></div>
          <div><strong>Registrada</strong><p>Crea lote por línea, entrada física y contable cuando aplica.</p></div>
          <div><strong>Costo</strong><p>El costo unitario se interpreta con IVA incluido según la regla de Intermotores.</p></div>
          <div><strong>Fuera contable</strong><p>Aumenta físico pero contable queda en cero hasta regularización.</p></div>
        </div>
      </aside>
    </section>

    <section class="purchase-main" *ngIf="tab()==='recepcion'">
      <article class="card wide">
        <div class="table-header"><div><h3>📦 Recepción de compras</h3><p class="muted">Registra borradores para crear lotes y Kardex de entrada.</p></div><select [(ngModel)]="statusFilter"><option value="">Todos</option><option value="borrador">Borradores</option><option value="registrada">Registradas</option><option value="anulada">Anuladas</option></select></div>
        <div class="table-wrap"><table><thead><tr><th>Compra</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let p of filteredPurchases()" [class.selected]="selectedPurchase()?.id===p.id">
            <td><strong>{{ p.purchase_code }}</strong><br><small>{{ p.document_reference || 'Sin referencia' }}</small></td><td>{{ p.supplier_name }}<br><small>{{ p.supplier_tax_id }}</small></td><td><span class="status-pill" [ngClass]="statusClass(p.status)">{{ statusLabel(p.status) }}</span></td><td>Q {{ money(p.total) }}</td><td><button class="btn small" (click)="selectPurchase(p)">Detalle</button><button class="btn small" *ngIf="p.status==='borrador'" (click)="registerPurchase(p)">✅ Registrar</button><button class="btn small danger" *ngIf="p.status!=='anulada'" (click)="voidPurchase(p)">🚫 Anular</button></td>
          </tr>
        </tbody></table></div>
      </article>
      <aside class="card context-card"><h3>📋 Líneas</h3><p class="muted" *ngIf="!selectedPurchase()">Selecciona una compra.</p><div class="line-card" *ngFor="let l of selectedLines()"><strong>{{ l.description }}</strong><span>Cant. {{ number(l.quantity) }} · Costo Q {{ money(l.unit_cost_with_tax) }}</span><small>Lote: {{ l.lot_id || 'pendiente' }} · Físico después {{ number(l.physical_after) }} · Contable después {{ number(l.accounting_after) }}</small></div></aside>
    </section>

    <section class="purchase-main" *ngIf="tab()==='proveedores'">
      <article class="card">
        <h3>🏢 Nuevo proveedor</h3>
        <div class="form-grid"><label>Nombre<input [(ngModel)]="supplierForm.name" /></label><label>NIT<input [(ngModel)]="supplierForm.tax_id" /></label><label>Contacto<input [(ngModel)]="supplierForm.contact_name" /></label><label>Teléfono<input [(ngModel)]="supplierForm.phone" /></label><label>Email<input [(ngModel)]="supplierForm.email" /></label><label>Dirección<input [(ngModel)]="supplierForm.address" /></label></div>
        <label>Notas<textarea [(ngModel)]="supplierForm.notes"></textarea></label><button class="btn primary wide-auto" [disabled]="saving()" (click)="createSupplier()">💾 Guardar proveedor</button>
      </article>
      <article class="card wide">
        <h3>📋 Proveedores registrados</h3>
        <div class="table-wrap"><table><thead><tr><th>Proveedor</th><th>NIT</th><th>Contacto</th><th>Historial</th></tr></thead><tbody><tr *ngFor="let s of filteredSuppliers()" [class.selected]="selectedSupplier()?.id===s.id"><td><strong>{{ s.name }}</strong><br><small>{{ s.notes || 'Sin notas' }}</small></td><td>{{ s.tax_id }}</td><td>{{ s.contact_name || '—' }}<br><small>{{ s.phone || 'Sin teléfono' }}</small></td><td><button class="btn small" (click)="selectSupplier(s)">Ver compras</button></td></tr></tbody></table></div>
      </article>
      <aside class="card context-card"><h3>📜 Historial proveedor</h3><p class="muted" *ngIf="!selectedSupplier()">Selecciona un proveedor.</p><ng-container *ngIf="selectedSupplier()"><h4>{{ selectedSupplier()?.name }}</h4><div class="line-card" *ngFor="let p of supplierPurchases()"><strong>{{ p.purchase_code }}</strong><span>{{ statusLabel(p.status) }} · Q {{ money(p.total) }}</span><small>{{ p.document_reference || 'Sin referencia' }}</small></div></ng-container></aside>
    </section>

    <section class="purchase-grid" *ngIf="tab()==='costos'">
      <article class="card wide"><h3>💰 Análisis de costos</h3><div class="cost-grid"><div><span>Total registrado</span><strong>Q {{ money(totalPurchased()) }}</strong></div><div><span>Costo promedio línea</span><strong>Q {{ money(avgCost()) }}</strong></div><div><span>Compras fuera contable</span><strong>{{ outAccountingLines() }}</strong></div><div><span>IVA</span><strong>Incluido</strong></div></div><p class="muted">Los costos se muestran con IVA incluido. La distribución de gastos de importación queda preparada para una fase posterior.</p></article>
      <article class="card"><h3>🚚 Importaciones base</h3><p class="muted">Preparado para contenedor, embarque, gastos, seguro, aduana y distribución futura de costos sin afectar compras locales.</p></article>
    </section>
  `,
  styles: [`
    .purchase-hero,.search-panel,.card,.kpi{background:var(--surface);color:var(--text);border:1px solid var(--border);box-shadow:0 14px 36px rgba(0,0,0,.08)}
    .purchase-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-radius:24px;padding:24px;margin-bottom:16px;background:linear-gradient(135deg,rgba(245,158,11,.16),rgba(15,98,254,.08))}.purchase-hero h1{margin:0 0 6px;font-size:2rem}.purchase-hero p{margin:0;color:var(--muted)}
    .hero-actions,.purchase-toolbar,.action-list,.quick-actions{display:flex;gap:10px;flex-wrap:wrap}.purchase-toolbar{margin:14px 0 16px}.tool{border:1px solid var(--border);background:var(--surface);color:var(--text);padding:11px 15px;border-radius:16px;font-weight:900;cursor:pointer}.tool.active,.tool:hover{background:rgba(245,158,11,.16);border-color:rgba(245,158,11,.42)}
    .purchase-search{display:grid;grid-template-columns:1fr minmax(260px,520px);gap:16px;align-items:center;border-radius:22px;padding:18px;margin-bottom:16px}.purchase-search p{margin:4px 0 0;color:var(--muted)}
    input,select,textarea{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:11px 12px}textarea{min-height:78px}.wide-auto{width:auto!important}.one-col{grid-template-columns:1fr!important}.small{padding:7px 10px;font-size:.85rem}.danger{color:#dc2626}.btn.danger{border-color:rgba(220,38,38,.34);background:rgba(220,38,38,.10)}
    .purchase-kpis{display:grid;grid-template-columns:repeat(6,minmax(135px,1fr));gap:12px;margin-bottom:16px}.kpi{text-align:left;border-radius:20px;padding:16px;cursor:pointer}.kpi span,.kpi small{display:block;color:var(--muted)}.kpi strong{display:block;font-size:1.65rem;margin:6px 0}.kpi.money{border-color:rgba(15,98,254,.28)}.kpi.ok{border-color:rgba(22,163,74,.28)}.kpi.warning{border-color:rgba(245,158,11,.35)}.kpi.danger{border-color:rgba(220,38,38,.28)}
    .alert{display:flex;gap:16px;align-items:center;border:1px solid var(--border);border-radius:18px;padding:14px 16px;margin:12px 0;background:rgba(15,98,254,.08)}.alert.success{background:rgba(22,163,74,.10)}.alert.danger{background:rgba(220,38,38,.10)}.alert.warning{background:rgba(245,158,11,.12)}.alert small{margin-left:auto;color:var(--muted)}
    .purchase-grid{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.purchase-main{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;align-items:start}.wide{grid-column:auto}.context-card{position:sticky;top:88px}.ops-grid,.cost-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.ops,.cost-grid>div{border:1px solid var(--border);background:rgba(245,158,11,.08);color:var(--text);border-radius:18px;padding:14px;text-align:left}.ops strong,.cost-grid strong{display:block;font-size:1.45rem}.ops span,.cost-grid span{color:var(--muted)}
    .table-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.section-title{font-weight:900;color:var(--primary);margin:16px 0 10px;border-bottom:1px solid var(--border);padding-bottom:8px}.line-editor{display:grid;grid-template-columns:minmax(220px,1fr) 90px 120px 120px 120px 145px minmax(120px,1fr) 42px;gap:8px;align-items:end;border:1px solid var(--border);border-radius:16px;padding:12px;margin-bottom:10px;background:rgba(148,163,184,.06)}.line-notes{min-width:0}.check{display:flex;flex-direction:row;align-items:center;gap:8px;font-size:.85rem}.document-totals{display:grid;grid-template-columns:1fr auto;gap:8px;margin:16px 0;padding:14px;border-radius:18px;border:1px solid var(--border);background:rgba(15,98,254,.06)}.document-totals strong:last-child{font-size:1.2rem}
    .table-wrap{overflow:auto;border:1px solid var(--border);border-radius:16px}table{width:100%;border-collapse:collapse}th,td{padding:11px 12px;border-bottom:1px solid var(--border);text-align:left}th{font-size:.76rem;text-transform:uppercase;color:var(--muted)}tr.selected{background:rgba(245,158,11,.12)}.status-pill{display:inline-flex;border-radius:999px;padding:6px 10px;border:1px solid var(--border);font-weight:900}.status-borrador{background:rgba(245,158,11,.14);color:#b45309}.status-registrada{background:rgba(22,163,74,.12);color:#15803d}.status-anulada{background:rgba(220,38,38,.12);color:#b91c1c}.context-avatar{width:58px;height:58px;border-radius:20px;display:grid;place-items:center;background:rgba(245,158,11,.16);font-size:1.8rem}.info-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.info-list span{color:var(--muted)}.info-list strong{text-align:right}.line-card{display:grid;gap:4px;border:1px solid var(--border);border-radius:14px;padding:10px;margin-bottom:8px;background:rgba(15,98,254,.05)}.line-card span,.line-card small{color:var(--muted)}.rules-grid.single{display:grid;gap:10px}.rules-grid.single>div{border:1px solid var(--border);border-radius:16px;padding:12px;background:rgba(245,158,11,.08)}
    @media(max-width:1280px){.purchase-kpis{grid-template-columns:repeat(2,1fr)}.purchase-grid,.purchase-main{grid-template-columns:1fr}.context-card{position:static}.line-editor{grid-template-columns:1fr 100px 120px}.purchase-search{grid-template-columns:1fr}}
    @media(max-width:720px){.purchase-hero,.table-header{flex-direction:column}.purchase-kpis{grid-template-columns:1fr}.line-editor{grid-template-columns:1fr}}
  `]
})
export class PurchasesComponent {
  private http = inject(HttpClient);
  tab = signal<'panel'|'compra'|'proveedores'|'recepcion'|'costos'>('panel');
  loading = signal(false); saving = signal(false); alert = signal<Alert|null>(null);
  products = signal<Product[]>([]); warehouses = signal<Warehouse[]>([]); purchases = signal<Purchase[]>([]); suppliers = signal<Supplier[]>([]);
  selectedPurchase = signal<Purchase|null>(null); selectedLines = signal<PurchaseLine[]>([]); selectedSupplier = signal<Supplier|null>(null); supplierPurchases = signal<Purchase[]>([]);
  search = ''; statusFilter = ''; editingPurchaseId = signal<number|null>(null);
  purchaseForm:any = { supplier_name:'Proveedor general', supplier_tax_id:'CF', warehouse_id:null, document_reference:'', status:'borrador', notes:'', internal_notes:'' };
  purchaseLines: PurchaseFormLine[] = [this.blankLine()];
  supplierForm:any = { name:'', tax_id:'CF', contact_name:'', phone:'', email:'', address:'', notes:'' };

  activePurchases = computed(() => this.purchases().filter(p => p.status !== 'anulada'));
  registeredPurchases = computed(() => this.purchases().filter(p => p.status === 'registrada'));
  draftPurchases = computed(() => this.purchases().filter(p => p.status === 'borrador'));
  voidPurchases = computed(() => this.purchases().filter(p => p.status === 'anulada'));

  constructor(){ this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    let pending = 4; const done = () => { pending--; if(pending===0) this.loading.set(false); };
    this.http.get<Product[]>(`${API}/products`).subscribe({ next:v=>this.products.set(v), error:e=>this.showError(e,'No se pudieron cargar productos'), complete:done });
    this.http.get<Warehouse[]>(`${API}/warehouses`).subscribe({ next:v=>this.warehouses.set(v), error:e=>this.showError(e,'No se pudieron cargar bodegas'), complete:done });
    this.http.get<Purchase[]>(`${API}/purchases`).subscribe({ next:v=>this.purchases.set(v), error:e=>this.showError(e,'No se pudieron cargar compras'), complete:done });
    this.http.get<Supplier[]>(`${API}/suppliers`).subscribe({ next:v=>this.suppliers.set(v), error:e=>this.showError(e,'No se pudieron cargar proveedores'), complete:done });
  }

  blankLine(): PurchaseFormLine { return { product_id:null, warehouse_id:null, lot_code:'', quantity:1, unit_cost_with_tax:0, is_out_of_accounting_inventory:false, notes:'' }; }
  addLine(){ this.purchaseLines.push(this.blankLine()); }
  removeLine(i:number){ if(this.purchaseLines.length>1) this.purchaseLines.splice(i,1); }
  resetPurchaseForm(){ this.editingPurchaseId.set(null); this.purchaseForm = { supplier_name:'Proveedor general', supplier_tax_id:'CF', warehouse_id:null, document_reference:'', status:'borrador', notes:'', internal_notes:'' }; this.purchaseLines = [this.blankLine()]; }
  purchaseSubtotal(){ return this.purchaseLines.reduce((s,l)=>s+(Number(l.quantity||0)*Number(l.unit_cost_with_tax||0)),0); }

  savePurchase(): void {
    const lines = this.purchaseLines.filter(l => l.product_id && Number(l.quantity)>0).map(l => ({ ...l, warehouse_id: l.warehouse_id || this.purchaseForm.warehouse_id || null }));
    if(!lines.length){ this.setAlert('warning','Compra incompleta','Agrega al menos una línea con producto y cantidad.'); return; }
    const body = { ...this.purchaseForm, lines };
    this.saving.set(true);
    const id = this.editingPurchaseId();
    const req = id ? this.http.put<Purchase>(`${API}/purchases/${id}`, body) : this.http.post<Purchase>(`${API}/purchases`, body);
    req.subscribe({ next:p=>{ this.saving.set(false); this.setAlert('success','Compra guardada', p.status==='borrador' ? 'Borrador guardado sin afectar inventario.' : 'Compra registrada, lotes y Kardex creados.'); this.resetPurchaseForm(); this.loadAll(); this.selectPurchase(p); }, error:e=>{ this.saving.set(false); this.showError(e,'No se pudo guardar la compra.'); } });
  }

  selectPurchase(p: Purchase|null|undefined): void { if(!p) return; this.selectedPurchase.set(p); this.http.get<PurchaseLine[]>(`${API}/purchases/${p.id}/lines`).subscribe({ next:v=>this.selectedLines.set(v), error:e=>this.showError(e,'No se pudieron cargar líneas') }); }
  registerPurchase(p: Purchase|null|undefined): void { if(!p) return; this.saving.set(true); this.http.post<Purchase>(`${API}/purchases/${p.id}/register`, {}).subscribe({ next:v=>{ this.saving.set(false); this.setAlert('success','Compra registrada','Se crearon lotes y Kardex de entrada.'); this.loadAll(); this.selectPurchase(v); }, error:e=>{ this.saving.set(false); this.showError(e,'No se pudo registrar la compra.'); } }); }
  voidPurchase(p: Purchase|null|undefined): void { if(!p) return; if(!confirm(`¿Anular ${p.purchase_code}?`)) return; this.saving.set(true); this.http.post<Purchase>(`${API}/purchases/${p.id}/void`, { reason:'Anulación desde Workspace Compras' }).subscribe({ next:v=>{ this.saving.set(false); this.setAlert('success','Compra anulada','Se aplicó reversa cuando correspondía.'); this.loadAll(); this.selectPurchase(v); }, error:e=>{ this.saving.set(false); this.showError(e,'No se pudo anular la compra.'); } }); }

  createSupplier(): void { if(!this.supplierForm.name?.trim()){ this.setAlert('warning','Proveedor incompleto','Ingresa el nombre del proveedor.'); return; } this.saving.set(true); this.http.post<Supplier>(`${API}/suppliers`, this.supplierForm).subscribe({ next:s=>{ this.saving.set(false); this.setAlert('success','Proveedor guardado',s.name); this.supplierForm={ name:'', tax_id:'CF', contact_name:'', phone:'', email:'', address:'', notes:'' }; this.loadAll(); this.selectSupplier(s); }, error:e=>{ this.saving.set(false); this.showError(e,'No se pudo guardar proveedor.'); } }); }
  selectSupplier(s: Supplier): void { this.selectedSupplier.set(s); this.http.get<Purchase[]>(`${API}/suppliers/${s.id}/purchases`).subscribe({ next:v=>this.supplierPurchases.set(v), error:e=>this.showError(e,'No se pudo cargar historial del proveedor.') }); }

  filteredPurchases(): Purchase[] { const q=this.search.toLowerCase().trim(); return this.purchases().filter(p => (!this.statusFilter || p.status===this.statusFilter) && (!q || `${p.purchase_code} ${p.supplier_name} ${p.supplier_tax_id} ${p.document_reference} ${p.status}`.toLowerCase().includes(q))); }
  filteredSuppliers(): Supplier[] { const q=this.search.toLowerCase().trim(); return this.suppliers().filter(s => !q || `${s.name} ${s.tax_id} ${s.phone} ${s.email}`.toLowerCase().includes(q)); }
  totalPurchased(){ return this.registeredPurchases().reduce((s,p)=>s+Number(p.total||0),0); }
  avgCost(){ const totals=this.purchases().map(p=>Number(p.total||0)).filter(v=>v>0); return totals.length ? totals.reduce((a,b)=>a+b,0)/totals.length : 0; }
  suppliersWithoutPhone(){ return this.suppliers().filter(s => !s.phone).length; }
  outAccountingLines(){ return this.selectedLines().filter(l=>l.is_out_of_accounting_inventory).length; }

  statusLabel(s:string){ return ({borrador:'Borrador', registrada:'Registrada', anulada:'Anulada'} as any)[s] || s; }
  statusClass(s:string){ return `status-${s}`; }
  number(v:any){ return Number(v||0); }
  money(v:any){ return Number(v||0).toFixed(2); }
  productName(id:number){ const p=this.products().find(x=>x.id===id); return p ? `${p.sku} — ${p.name}` : `Producto ${id}`; }
  setAlert(type:Alert['type'], title:string, message:string, detail=''){ this.alert.set({type,title,message,detail}); }
  showError(err:any, fallback:string){ const detail = err?.error?.detail || err?.message || ''; this.setAlert('danger','Acción no completada',fallback, typeof detail === 'string' ? detail : JSON.stringify(detail)); }

  printPurchase(p: Purchase|null|undefined): void { if(!p) return; const lines = this.selectedPurchase()?.id===p.id ? this.selectedLines() : []; const html = `<html><head><title>${p.purchase_code}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}.total{text-align:right;font-size:20px;font-weight:bold}</style></head><body><h1>Compra ${p.purchase_code}</h1><p><b>Proveedor:</b> ${p.supplier_name} · ${p.supplier_tax_id}</p><p><b>Estado:</b> ${this.statusLabel(p.status)} · <b>Referencia:</b> ${p.document_reference || '—'}</p><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo</th><th>Total</th></tr></thead><tbody>${lines.map(l=>`<tr><td>${l.description}</td><td>${this.number(l.quantity)}</td><td>Q ${this.money(l.unit_cost_with_tax)}</td><td>Q ${this.money(l.line_total_with_tax)}</td></tr>`).join('')}</tbody></table><p class="total">Total Q ${this.money(p.total)}</p></body></html>`; const w=window.open('','_blank','width=900,height=700'); if(w){ w.document.write(html); w.document.close(); w.print(); } }
  printSummary(): void { const html = `<html><head><title>Resumen compras</title><style>body{font-family:Arial;padding:24px}.k{display:inline-block;border:1px solid #ddd;border-radius:12px;padding:12px;margin:6px}</style></head><body><h1>Resumen de Compras</h1><div class="k">Compras: ${this.purchases().length}</div><div class="k">Total: Q ${this.money(this.totalPurchased())}</div><div class="k">Borradores: ${this.draftPurchases().length}</div><div class="k">Proveedores: ${this.suppliers().length}</div></body></html>`; const w=window.open('','_blank','width=900,height=700'); if(w){ w.document.write(html); w.document.close(); w.print(); } }
  exportPurchasesCsv(): void { const rows = [['codigo','proveedor','nit','estado','referencia','subtotal','total'], ...this.filteredPurchases().map(p=>[p.purchase_code,p.supplier_name,p.supplier_tax_id,p.status,p.document_reference,String(p.subtotal),String(p.total)])]; const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='compras_v15_2_0.csv'; a.click(); URL.revokeObjectURL(url); }
}
