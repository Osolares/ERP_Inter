import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/inventory';

type Product = { id:number; sku:string; name:string; condition:string; product_type:string; price_sale:any; price_offer:any; inventory_mode:string; fuel_type?:string; displacement_cc?:string; };
type Lot = { id:number; product_id:number; lot_code:string; physical_qty:any; accounting_qty:any; available_physical:any; available_accounting:any; unit_cost:any; sale_price:any; special_lot_price:any; location:string; is_blocked:boolean; is_sellable:boolean; is_out_of_accounting_inventory:boolean; inventory_status:string; engine_number?:string; serial_number?:string; };
type Customer = { id:number; name:string; tax_id:string; phone:string; email:string; address:string; discount_percent:any; price_type:string; notes:string; };
type Invoice = { id:number; invoice_code:string; source_exit_id:number|null; client_name:string; client_tax_id:string; status:string; subtotal:any; tax_total:any; total:any; notes:string; internal_notes:string; is_active:boolean; };
type InvoiceLine = { id:number; invoice_id:number; product_id:number; lot_id:number|null; description:string; quantity:any; unit_price:any; total_line:any; affects_physical:boolean; affects_accounting:boolean; };
type Exit = { id:number; exit_code:string; client_name:string; client_tax_id:string; status:string; is_invoiced:boolean; invoice_reference:string; total_reference:any; notes:string; };
type CartLine = { lot:Lot; product:Product|undefined; quantity:number; unit_price:number; discount_percent:number; notes:string; };
type Alert = { type:'success'|'warning'|'danger'|'info'; title:string; message:string; detail?:string; };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toast" *ngIf="toast()">{{ toast() }}</div>

    <section class="commercial-hero">
      <div>
        <span class="eyebrow">💼 ERP v15.2.0 · Workspace Comercial</span>
        <h1>Comercial Profesional</h1>
        <p>POS, facturación, salidas, clientes, pagos base y acciones rápidas desde un solo centro de trabajo.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" [disabled]="loading()" (click)="loadAll()">🔄 Actualizar</button>
        <button class="btn primary" type="button" (click)="tab.set('pos')">🛒 Nueva venta</button>
      </div>
    </section>

    <section class="commercial-toolbar">
      <button class="tool" [class.active]="tab()==='dashboard'" (click)="tab.set('dashboard')">📊 Panel</button>
      <button class="tool" [class.active]="tab()==='pos'" (click)="tab.set('pos')">🛒 POS</button>
      <button class="tool" [class.active]="tab()==='facturas'" (click)="tab.set('facturas')">🧾 Facturas</button>
      <button class="tool" [class.active]="tab()==='salidas'" (click)="tab.set('salidas')">🚚 Salidas</button>
      <button class="tool" [class.active]="tab()==='clientes'" (click)="tab.set('clientes')">👥 Clientes</button>
      <button class="tool" [class.active]="tab()==='pagos'" (click)="tab.set('pagos')">💳 Pagos base</button>
      <button class="tool" (click)="printCommercialSummary()">🖨️ Resumen</button>
    </section>

    <section class="search-panel">
      <div>
        <strong>🔎 Búsqueda comercial</strong>
        <p>Busca clientes, facturas, salidas, productos o lotes sin cambiar de módulo.</p>
      </div>
      <input [(ngModel)]="globalSearch" placeholder="Buscar D4CB, factura, cliente, NIT, lote..." />
    </section>

    <section class="kpi-grid">
      <button class="kpi" (click)="tab.set('facturas')"><span>Ventas emitidas</span><strong>{{ activeInvoices().length }}</strong><small>Facturas activas</small></button>
      <button class="kpi" (click)="tab.set('facturas')"><span>Total facturado</span><strong>Q {{ money(totalInvoices()) }}</strong><small>Sin anuladas</small></button>
      <button class="kpi" (click)="tab.set('salidas')"><span>Salidas pendientes</span><strong>{{ pendingExits().length }}</strong><small>Por facturar</small></button>
      <button class="kpi" (click)="tab.set('clientes')"><span>Clientes</span><strong>{{ customers().length }}</strong><small>Base comercial</small></button>
      <button class="kpi" (click)="tab.set('pos')"><span>Lotes vendibles</span><strong>{{ saleableLots().length }}</strong><small>Disponibles POS</small></button>
      <button class="kpi danger" (click)="tab.set('facturas')"><span>Anuladas</span><strong>{{ voidedInvoices().length }}</strong><small>Control comercial</small></button>
    </section>

    <section class="alert" *ngIf="alert()" [class.danger]="alert()?.type==='danger'" [class.success]="alert()?.type==='success'" [class.warning]="alert()?.type==='warning'">
      <strong>{{ alert()?.title }}</strong>
      <span>{{ alert()?.message }}</span>
      <small *ngIf="alert()?.detail">{{ alert()?.detail }}</small>
      <button class="btn small" (click)="alert.set(null)">Cerrar</button>
    </section>

    <section class="commercial-grid" *ngIf="tab()==='dashboard'">
      <article class="card wide">
        <h3>⭐ Operaciones que requieren atención</h3>
        <div class="ops-grid">
          <button class="ops" (click)="tab.set('salidas'); searchTerm='pendiente'">🚚 <strong>{{ pendingExits().length }}</strong><span>Salidas pendientes de facturar</span></button>
          <button class="ops" (click)="tab.set('facturas'); searchTerm='anulada'">🧾 <strong>{{ voidedInvoices().length }}</strong><span>Facturas anuladas</span></button>
          <button class="ops" (click)="tab.set('pos')">🛒 <strong>{{ saleableLots().length }}</strong><span>Lotes listos para POS</span></button>
          <button class="ops" (click)="tab.set('clientes')">👥 <strong>{{ customersWithoutPhone() }}</strong><span>Clientes sin teléfono</span></button>
        </div>
      </article>
      <article class="card">
        <h3>⚡ Acciones rápidas</h3>
        <div class="action-list">
          <button class="btn primary" (click)="tab.set('pos')">🛒 Abrir POS</button>
          <button class="btn" (click)="tab.set('facturas')">🧾 Ver facturas</button>
          <button class="btn" (click)="tab.set('salidas')">🚚 Ver salidas</button>
          <button class="btn" (click)="tab.set('clientes')">➕ Crear cliente</button>
        </div>
      </article>
      <article class="card wide">
        <h3>🔎 Resultados de búsqueda</h3>
        <p class="muted" *ngIf="!globalSearch.trim()">Escribe algo arriba para buscar en todo el Workspace Comercial.</p>
        <div class="result-list" *ngIf="globalSearch.trim()">
          <button class="result" *ngFor="let r of globalResults().slice(0,12)" (click)="openResult(r)"><strong>{{ r.icon }} {{ r.title }}</strong><span>{{ r.subtitle }}</span></button>
        </div>
      </article>
    </section>

    <section class="pos-layout" *ngIf="tab()==='pos'">
      <article class="card pos-products">
        <div class="section-head"><div><h3>🛒 Punto de venta</h3><p>Busca producto/lote, agrega al carrito y cobra sin doble clic.</p></div><input [(ngModel)]="searchTerm" placeholder="Buscar producto, SKU, lote..." /></div>
        <div class="category-row">
          <button class="chip-btn" [class.active]="posTypeFilter===''" (click)="posTypeFilter=''">Todos</button>
          <button class="chip-btn" [class.active]="posTypeFilter==='motor'" (click)="posTypeFilter='motor'">Motores</button>
          <button class="chip-btn" [class.active]="posTypeFilter==='repuesto'" (click)="posTypeFilter='repuesto'">Repuestos</button>
          <button class="chip-btn" [class.active]="posTypeFilter==='servicio'" (click)="posTypeFilter='servicio'">Servicios</button>
        </div>
        <div class="product-cards">
          <button class="product-card" *ngFor="let l of filteredSaleableLots().slice(0,60)" (click)="addLotToCart(l)">
            <span class="badge">{{ productById(l.product_id)?.condition || 'producto' }}</span>
            <strong>{{ productById(l.product_id)?.sku || 'SKU' }}</strong>
            <em>{{ productById(l.product_id)?.name || 'Producto' }}</em>
            <small>Lote {{ l.lot_code }} · Disp. {{ number(l.available_physical) }}</small>
            <b>Q {{ money(lotPrice(l)) }}</b>
          </button>
        </div>
      </article>

      <aside class="card cart-card">
        <h3>🧾 Carrito</h3>
        <label>Cliente
          <select [(ngModel)]="selectedCustomerId" (ngModelChange)="applyCustomer()">
            <option [ngValue]="null">Consumidor final</option>
            <option *ngFor="let c of customers()" [ngValue]="c.id">{{ c.name }} · {{ c.tax_id }}</option>
          </select>
        </label>
        <div class="quick-customer">
          <input [(ngModel)]="quickCustomer.name" placeholder="Cliente rápido" />
          <input [(ngModel)]="quickCustomer.tax_id" placeholder="NIT" />
          <button class="btn small" (click)="createQuickCustomer()">👥 Crear</button>
        </div>
        <div class="cart-lines">
          <div class="cart-line" *ngFor="let line of cart(); let i = index">
            <div><strong>{{ line.product?.sku }}</strong><span>{{ line.lot.lot_code }}</span></div>
            <input type="number" [(ngModel)]="line.quantity" min="1" />
            <input type="number" [(ngModel)]="line.unit_price" />
            <input type="number" [(ngModel)]="line.discount_percent" placeholder="% desc." />
            <button class="btn small danger" (click)="removeCartLine(i)">✕</button>
          </div>
        </div>
        <label>Descuento general %<input type="number" [(ngModel)]="generalDiscount" /></label>
        <label>Método de pago
          <select [(ngModel)]="paymentMethod"><option>efectivo</option><option>tarjeta</option><option>transferencia</option><option>crédito</option><option>mixto</option></select>
        </label>
        <label>Recibido Q<input type="number" [(ngModel)]="receivedAmount" /></label>
        <div class="totals">
          <span>Subtotal</span><strong>Q {{ money(cartSubtotal()) }}</strong>
          <span>Descuento</span><strong>Q {{ money(cartDiscount()) }}</strong>
          <span>Total</span><strong>Q {{ money(cartTotal()) }}</strong>
          <span>Vuelto</span><strong>Q {{ money(changeAmount()) }}</strong>
        </div>
        <div class="cart-actions">
          <button class="btn" (click)="savePendingSale()">💾 Pendiente</button>
          <button class="btn" (click)="loadPendingSale()">📂 Cargar</button>
          <button class="btn" [disabled]="busy() || !cart().length" (click)="createWarehouseExitFromCart()">🚚 Salida</button>
          <button class="btn primary" [disabled]="busy() || !cart().length" (click)="chargeCart()">{{ busy() ? 'Procesando...' : '💳 Cobrar' }}</button>
        </div>
      </aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='facturas'">
      <article class="card table-card">
        <div class="section-head"><div><h3>🧾 Facturas</h3><p>{{ filteredInvoices().length }} documento(s)</p></div><input [(ngModel)]="searchTerm" placeholder="Buscar factura, cliente, estado..." /></div>
        <table><thead><tr><th>Código</th><th>Cliente</th><th>Estado</th><th>Origen</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let f of filteredInvoices()" [class.selected]="selectedInvoice()?.id===f.id" (click)="selectInvoice(f)">
            <td><strong>{{ f.invoice_code }}</strong></td><td>{{ f.client_name }}<br><small>{{ f.client_tax_id }}</small></td><td><span class="state" [class.void]="f.status==='anulada'">{{ f.status }}</span></td><td>{{ f.source_exit_id ? 'Salida' : 'Directa/POS' }}</td><td>Q {{ money(f.total) }}</td>
            <td (click)="$event.stopPropagation()"><button class="btn small" (click)="printInvoice(f)">🖨️</button><button class="btn small danger" [disabled]="f.status==='anulada'" (click)="voidInvoice(f)">Anular</button></td>
          </tr>
        </tbody></table>
      </article>
      <aside class="card context-panel">
        <ng-container *ngIf="selectedInvoice(); else emptyContext">
          <h3>🧾 {{ selectedInvoice()?.invoice_code }}</h3>
          <p>{{ selectedInvoice()?.client_name }} · {{ selectedInvoice()?.client_tax_id }}</p>
          <div class="totals compact"><span>Subtotal</span><strong>Q {{ money(selectedInvoice()?.subtotal) }}</strong><span>Total</span><strong>Q {{ money(selectedInvoice()?.total) }}</strong><span>Estado</span><strong>{{ selectedInvoice()?.status }}</strong></div>
          <h4>Líneas</h4>
          <div class="mini-line" *ngFor="let l of invoiceLines()"><span>{{ l.description }}</span><strong>{{ l.quantity }} × Q {{ money(l.unit_price) }}</strong></div>
          <div class="action-list"><button class="btn" (click)="printInvoice(selectedInvoice())">🖨️ Imprimir</button><button class="btn danger" (click)="voidInvoice(selectedInvoice())">Anular</button></div>
        </ng-container>
        <ng-template #emptyContext><p class="muted">Selecciona una factura para ver detalle, líneas, auditoría resumida y acciones rápidas.</p></ng-template>
      </aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='salidas'">
      <article class="card table-card"><div class="section-head"><div><h3>🚚 Salidas</h3><p>Entregas físicas pendientes o facturadas.</p></div><input [(ngModel)]="searchTerm" placeholder="Buscar salida..." /></div>
        <table><thead><tr><th>Código</th><th>Cliente</th><th>Estado</th><th>Factura</th><th>Total ref.</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let e of filteredExits()"><td><strong>{{ e.exit_code }}</strong></td><td>{{ e.client_name }}<br><small>{{ e.client_tax_id }}</small></td><td><span class="state">{{ e.status }}</span></td><td>{{ e.invoice_reference || 'Pendiente' }}</td><td>Q {{ money(e.total_reference) }}</td><td><button class="btn small" [disabled]="e.is_invoiced" (click)="invoiceExit(e)">🧾 Facturar</button></td></tr>
        </tbody></table>
      </article>
      <aside class="card context-panel"><h3>📦 Flujo salida → factura</h3><p>La salida descuenta físico. La factura posterior descuenta contable sin volver a tocar físico.</p><button class="btn primary" (click)="tab.set('pos')">Crear desde carrito POS</button></aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='clientes'">
      <article class="card table-card"><div class="section-head"><div><h3>👥 Clientes</h3><p>Base comercial y creación rápida.</p></div><input [(ngModel)]="searchTerm" placeholder="Buscar cliente..." /></div>
        <table><thead><tr><th>Cliente</th><th>NIT</th><th>Contacto</th><th>Descuento</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let c of filteredCustomers()"><td><strong>{{ c.name }}</strong><br><small>{{ c.address || 'Sin dirección' }}</small></td><td>{{ c.tax_id }}</td><td>{{ c.phone || '—' }}<br><small>{{ c.email || '' }}</small></td><td>{{ c.discount_percent || 0 }}%</td><td><button class="btn small" (click)="selectCustomerForPOS(c)">🛒 Usar en POS</button></td></tr>
        </tbody></table>
      </article>
      <aside class="card context-panel"><h3>➕ Cliente rápido</h3><label>Nombre<input [(ngModel)]="quickCustomer.name" /></label><label>NIT<input [(ngModel)]="quickCustomer.tax_id" /></label><label>Teléfono<input [(ngModel)]="quickCustomer.phone" /></label><label>Dirección<textarea [(ngModel)]="quickCustomer.address"></textarea></label><button class="btn primary" (click)="createQuickCustomer()">Guardar cliente</button></aside>
    </section>

    <section class="commercial-grid" *ngIf="tab()==='pagos'">
      <article class="card wide"><h3>💳 Pagos base</h3><p class="muted">Base visual preparada para Caja: contado, crédito, anticipo y saldos pendientes. En esta versión el método de pago se guarda en notas de la factura/POS para mantener compatibilidad sin migraciones adicionales.</p><div class="payment-grid"><div><span>Contado</span><strong>{{ paymentCount('efectivo') }}</strong></div><div><span>Tarjeta</span><strong>{{ paymentCount('tarjeta') }}</strong></div><div><span>Transferencia</span><strong>{{ paymentCount('transferencia') }}</strong></div><div><span>Crédito</span><strong>{{ paymentCount('crédito') }}</strong></div></div></article>
    </section>
  `,
  styles: [`
    :host{display:block}.commercial-hero{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:28px;border-radius:28px;background:linear-gradient(135deg,#14213d,#0f766e);color:white;margin-bottom:18px;box-shadow:0 20px 50px rgba(15,118,110,.22)}.commercial-hero h1{font-size:34px;margin:6px 0}.commercial-hero p{max-width:760px;opacity:.9}.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:12px;opacity:.85}.hero-actions,.cart-actions,.action-list{display:flex;gap:10px;flex-wrap:wrap}.btn{border:1px solid rgba(148,163,184,.35);background:var(--surface-card,#fff);color:inherit;border-radius:14px;padding:10px 14px;cursor:pointer;font-weight:700}.btn.primary{background:#0f766e;color:white;border-color:#0f766e}.btn.danger,.btn.danger-alert{background:#fee2e2;color:#991b1b}.btn.small{padding:7px 10px;font-size:12px}.btn:disabled{opacity:.55;cursor:not-allowed}.commercial-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.tool{border:0;background:#eef2ff;padding:10px 13px;border-radius:14px;font-weight:800;cursor:pointer}.tool.active{background:#0f766e;color:white}.search-panel,.alert{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:16px;margin:14px 0}.search-panel input,.section-head input,input,select,textarea{border:1px solid #d1d5db;border-radius:12px;padding:10px;background:#fff;min-width:0}.search-panel input{width:min(520px,55vw)}.kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:12px;margin:16px 0}.kpi{display:flex;flex-direction:column;text-align:left;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;cursor:pointer}.kpi strong{font-size:26px}.kpi small,.muted{color:#64748b}.kpi.danger strong{color:#b91c1c}.card{background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:18px;box-shadow:0 12px 30px rgba(15,23,42,.05)}.commercial-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}.wide{grid-column:span 1}.ops-grid,.payment-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ops{border:1px solid #e5e7eb;background:#f8fafc;border-radius:18px;padding:16px;text-align:left;cursor:pointer}.ops strong{font-size:24px;margin:0 8px}.result-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.result{display:flex;flex-direction:column;align-items:flex-start;border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:12px;cursor:pointer}.pos-layout,.split-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(360px,.8fr);gap:16px}.section-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.category-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.chip-btn,.badge,.state{border:0;background:#e0f2fe;border-radius:999px;padding:7px 11px;font-weight:800}.chip-btn.active{background:#0f766e;color:white}.product-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;max-height:62vh;overflow:auto}.product-card{position:relative;text-align:left;border:1px solid #e5e7eb;background:linear-gradient(180deg,#fff,#f8fafc);border-radius:18px;padding:16px;min-height:150px;cursor:pointer}.product-card strong,.product-card em,.product-card small,.product-card b{display:block}.product-card em{font-style:normal;margin:8px 0;color:#334155}.product-card b{font-size:20px;margin-top:10px;color:#0f766e}.badge{position:absolute;right:12px;top:12px;font-size:11px}.cart-card{position:sticky;top:16px;align-self:start}.quick-customer{display:grid;grid-template-columns:1fr 90px auto;gap:8px}.cart-lines{display:flex;flex-direction:column;gap:8px;margin:12px 0;max-height:260px;overflow:auto}.cart-line{display:grid;grid-template-columns:1fr 58px 82px 74px auto;gap:6px;align-items:center;background:#f8fafc;border-radius:14px;padding:8px}.cart-line span{display:block;color:#64748b;font-size:12px}.totals{display:grid;grid-template-columns:1fr auto;gap:8px;background:#f8fafc;border-radius:16px;padding:14px;margin:12px 0}.totals.compact{margin:8px 0}.table-card table{width:100%;border-collapse:collapse}.table-card th,.table-card td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}.table-card tr{cursor:pointer}.table-card tr.selected{background:#ecfeff}.state{background:#dcfce7}.state.void{background:#fee2e2;color:#991b1b}.context-panel{position:sticky;top:16px;align-self:start}.mini-line{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #e5e7eb;padding:8px 0}.alert.success{background:#ecfdf5}.alert.danger{background:#fef2f2}.alert.warning{background:#fffbeb}.toast{position:fixed;right:20px;top:20px;z-index:50;background:#0f766e;color:white;padding:12px 16px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.18)}label{display:flex;flex-direction:column;gap:6px;margin:10px 0;font-weight:700}@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.pos-layout,.split-layout,.commercial-grid{grid-template-columns:1fr}.cart-card,.context-panel{position:static}.ops-grid,.payment-grid,.result-list{grid-template-columns:1fr}.search-panel{display:block}.search-panel input{width:100%;margin-top:10px}}`]
})
export class CommercialComponent {
  private http = inject(HttpClient);
  loading = signal(false); busy = signal(false); toast = signal(''); alert = signal<Alert|null>(null);
  tab = signal<'dashboard'|'pos'|'facturas'|'salidas'|'clientes'|'pagos'>('dashboard');
  products = signal<Product[]>([]); lots = signal<Lot[]>([]); customers = signal<Customer[]>([]); invoices = signal<Invoice[]>([]); exits = signal<Exit[]>([]); invoiceLines = signal<InvoiceLine[]>([]);
  selectedInvoice = signal<Invoice|null>(null);
  cart = signal<CartLine[]>([]);
  globalSearch = ''; searchTerm = ''; posTypeFilter = ''; selectedCustomerId:number|null = null; generalDiscount = 0; receivedAmount = 0; paymentMethod = 'efectivo';
  quickCustomer:any = { name:'', tax_id:'CF', phone:'', email:'', address:'' };

  constructor(){ this.loadAll(); }

  loadAll(){
    this.loading.set(true);
    Promise.all([
      this.http.get<Product[]>(`${API}/products`).toPromise(), this.http.get<Lot[]>(`${API}/lots`).toPromise(), this.http.get<Customer[]>(`${API}/customers`).toPromise(),
      this.http.get<Invoice[]>(`${API}/sales-invoices`).toPromise(), this.http.get<Exit[]>(`${API}/warehouse-exits`).toPromise()
    ]).then(([p,l,c,i,e])=>{ this.products.set(p||[]); this.lots.set(l||[]); this.customers.set(c||[]); this.invoices.set(i||[]); this.exits.set(e||[]); this.loading.set(false); }).catch(err=>this.fail('No se pudo cargar Comercial', err));
  }
  number(v:any){ return Number(v||0); } money(v:any){ return this.number(v).toFixed(2); }
  productById(id:number){ return this.products().find(p=>p.id===id); }
  lotPrice(l:Lot){ const p=this.productById(l.product_id); return this.number(l.special_lot_price)||this.number(l.sale_price)||this.number(p?.price_offer)||this.number(p?.price_sale)||0; }
  saleableLots = computed(()=> this.lots().filter(l=>!l.is_blocked && l.is_sellable && this.number(l.available_physical)>0));
  activeInvoices = computed(()=> this.invoices().filter(f=>f.status!=='anulada'));
  voidedInvoices = computed(()=> this.invoices().filter(f=>f.status==='anulada'));
  pendingExits = computed(()=> this.exits().filter(e=>!e.is_invoiced && e.status!=='anulada'));
  totalInvoices(){ return this.activeInvoices().reduce((a,f)=>a+this.number(f.total),0); }
  customersWithoutPhone(){ return this.customers().filter(c=>!c.phone).length; }
  filteredSaleableLots(){ const q=this.searchTerm.toLowerCase().trim(); return this.saleableLots().filter(l=>{ const p=this.productById(l.product_id); const text=`${l.lot_code} ${l.engine_number||''} ${l.location||''} ${p?.sku||''} ${p?.name||''} ${p?.product_type||''}`.toLowerCase(); return (!q||text.includes(q)) && (!this.posTypeFilter || p?.product_type===this.posTypeFilter); }); }
  filteredInvoices(){ const q=this.searchTerm.toLowerCase().trim(); return this.invoices().filter(f=>`${f.invoice_code} ${f.client_name} ${f.client_tax_id} ${f.status}`.toLowerCase().includes(q)); }
  filteredExits(){ const q=this.searchTerm.toLowerCase().trim(); return this.exits().filter(e=>`${e.exit_code} ${e.client_name} ${e.client_tax_id} ${e.status}`.toLowerCase().includes(q)); }
  filteredCustomers(){ const q=this.searchTerm.toLowerCase().trim(); return this.customers().filter(c=>`${c.name} ${c.tax_id} ${c.phone} ${c.email}`.toLowerCase().includes(q)); }
  globalResults(){ const q=this.globalSearch.toLowerCase().trim(); if(!q) return []; const rows:any[]=[]; this.customers().forEach(c=>{ if(`${c.name} ${c.tax_id}`.toLowerCase().includes(q)) rows.push({type:'cliente', icon:'👥', id:c.id, title:c.name, subtitle:c.tax_id}); }); this.invoices().forEach(f=>{ if(`${f.invoice_code} ${f.client_name} ${f.status}`.toLowerCase().includes(q)) rows.push({type:'factura', icon:'🧾', id:f.id, title:f.invoice_code, subtitle:`${f.client_name} · Q ${this.money(f.total)}`}); }); this.exits().forEach(e=>{ if(`${e.exit_code} ${e.client_name} ${e.status}`.toLowerCase().includes(q)) rows.push({type:'salida', icon:'🚚', id:e.id, title:e.exit_code, subtitle:`${e.client_name} · ${e.status}`}); }); this.products().forEach(p=>{ if(`${p.sku} ${p.name}`.toLowerCase().includes(q)) rows.push({type:'producto', icon:'📦', id:p.id, title:p.sku, subtitle:p.name}); }); this.lots().forEach(l=>{ if(`${l.lot_code} ${l.engine_number||''}`.toLowerCase().includes(q)) rows.push({type:'lote', icon:'🏷️', id:l.id, title:l.lot_code, subtitle:this.productById(l.product_id)?.name || 'Lote'}); }); return rows; }
  openResult(r:any){ if(r.type==='factura'){ const f=this.invoices().find(x=>x.id===r.id); if(f) this.selectInvoice(f); this.tab.set('facturas'); } else if(r.type==='cliente'){ this.tab.set('clientes'); this.searchTerm=r.title; } else if(r.type==='salida'){ this.tab.set('salidas'); this.searchTerm=r.title; } else { this.tab.set('pos'); this.searchTerm=r.title; } }
  addLotToCart(lot:Lot){ const p=this.productById(lot.product_id); const current=this.cart(); const existing=current.find(x=>x.lot.id===lot.id); if(existing){ existing.quantity += 1; this.cart.set([...current]); } else this.cart.set([...current,{lot,product:p,quantity:1,unit_price:this.lotPrice(lot),discount_percent:0,notes:''}]); this.showToast('Producto agregado al carrito'); }
  removeCartLine(i:number){ const rows=[...this.cart()]; rows.splice(i,1); this.cart.set(rows); }
  cartSubtotal(){ return this.cart().reduce((a,l)=>a+(this.number(l.quantity)*this.number(l.unit_price)),0); }
  cartDiscount(){ const lineDisc=this.cart().reduce((a,l)=>a+(this.number(l.quantity)*this.number(l.unit_price)*(this.number(l.discount_percent)/100)),0); const after=this.cartSubtotal()-lineDisc; return lineDisc + (after*(this.number(this.generalDiscount)/100)); }
  cartTotal(){ return Math.max(0,this.cartSubtotal()-this.cartDiscount()); }
  changeAmount(){ return Math.max(0,this.number(this.receivedAmount)-this.cartTotal()); }
  applyCustomer(){ const c=this.customers().find(x=>x.id===this.selectedCustomerId); if(c){ this.quickCustomer={...this.quickCustomer,name:c.name,tax_id:c.tax_id,phone:c.phone,address:c.address}; if(this.number(c.discount_percent)>0) this.generalDiscount=this.number(c.discount_percent); } }
  selectCustomerForPOS(c:Customer){ this.selectedCustomerId=c.id; this.applyCustomer(); this.tab.set('pos'); }
  createQuickCustomer(){ const name=(this.quickCustomer.name||'').trim(); if(!name){ this.warn('Cliente requerido','Ingresa el nombre del cliente.'); return; } this.http.post<Customer>(`${API}/customers`,{...this.quickCustomer,tax_id:this.quickCustomer.tax_id||'CF'}).subscribe({ next:c=>{ this.customers.set([c,...this.customers().filter(x=>x.id!==c.id)]); this.selectedCustomerId=c.id; this.applyCustomer(); this.showToast('Cliente creado correctamente'); }, error:err=>this.fail('No se pudo crear cliente',err) }); }
  validateCart(){ if(!this.cart().length) throw new Error('El carrito está vacío.'); for(const l of this.cart()){ if(this.number(l.quantity)<=0) throw new Error(`Cantidad inválida en lote ${l.lot.lot_code}.`); if(this.number(l.quantity)>this.number(l.lot.available_physical)) throw new Error(`El lote ${l.lot.lot_code} solo tiene disponible ${l.lot.available_physical}.`); } }
  chargeCart(){ try{ this.validateCart(); }catch(e:any){ this.warn('Revisa el carrito', e.message); return; } this.busy.set(true); const payload={ client_name:this.quickCustomer.name||'Consumidor final', client_tax_id:this.quickCustomer.tax_id||'CF', notes:`POS v15.2.0 · método de pago: ${this.paymentMethod} · recibido Q${this.money(this.receivedAmount)} · vuelto Q${this.money(this.changeAmount())}`, internal_notes:`Descuento general ${this.generalDiscount}%`, lines:this.cart().map(l=>({lot_id:l.lot.id, quantity:l.quantity, unit_price:this.lineNetPrice(l), notes:`Descuento línea ${l.discount_percent||0}%`}))}; this.http.post<Invoice>(`${API}/sales-invoices/direct`,payload).subscribe({ next:inv=>{ this.busy.set(false); this.cart.set([]); this.selectedInvoice.set(inv); this.tab.set('facturas'); this.loadInvoiceLines(inv); this.loadAll(); this.success('Venta facturada',`Se generó la factura ${inv.invoice_code}.`); this.printInvoice(inv); }, error:err=>{this.busy.set(false); this.fail('No se pudo cobrar',err);} }); }
  lineNetPrice(l:CartLine){ const gross=this.number(l.unit_price); const disc=gross*(this.number(l.discount_percent)/100); const afterLine=Math.max(0,gross-disc); const afterGeneral=afterLine*(1-(this.number(this.generalDiscount)/100)); return Number(afterGeneral.toFixed(2)); }
  createWarehouseExitFromCart(){ try{ this.validateCart(); }catch(e:any){ this.warn('Revisa el carrito', e.message); return; } this.busy.set(true); const payload={client_name:this.quickCustomer.name||'Consumidor final',client_tax_id:this.quickCustomer.tax_id||'CF',notes:`Salida creada desde Workspace Comercial v15.2.0`, internal_notes:`Método previsto: ${this.paymentMethod}`, lines:this.cart().map(l=>({lot_id:l.lot.id,quantity:l.quantity,unit_price_reference:this.lineNetPrice(l),notes:l.notes||''}))}; this.http.post<Exit>(`${API}/warehouse-exits`,payload).subscribe({ next:e=>{ this.busy.set(false); this.cart.set([]); this.loadAll(); this.success('Salida creada',`Se creó la salida ${e.exit_code}. Queda pendiente de facturar.`); this.tab.set('salidas'); }, error:err=>{this.busy.set(false); this.fail('No se pudo crear salida',err);} }); }
  savePendingSale(){ localStorage.setItem('erp_pos_pending_sale_v15', JSON.stringify({cart:this.cart(), quickCustomer:this.quickCustomer, selectedCustomerId:this.selectedCustomerId, generalDiscount:this.generalDiscount, paymentMethod:this.paymentMethod, receivedAmount:this.receivedAmount})); this.showToast('Venta pendiente guardada'); }
  loadPendingSale(){ const raw=localStorage.getItem('erp_pos_pending_sale_v15'); if(!raw){ this.warn('Sin venta pendiente','No hay venta pendiente guardada.'); return; } const data=JSON.parse(raw); this.cart.set(data.cart||[]); this.quickCustomer=data.quickCustomer||this.quickCustomer; this.selectedCustomerId=data.selectedCustomerId||null; this.generalDiscount=data.generalDiscount||0; this.paymentMethod=data.paymentMethod||'efectivo'; this.receivedAmount=data.receivedAmount||0; this.showToast('Venta pendiente cargada'); }
  selectInvoice(f:Invoice){ this.selectedInvoice.set(f); this.loadInvoiceLines(f); }
  loadInvoiceLines(f:Invoice){ this.http.get<InvoiceLine[]>(`${API}/sales-invoices/${f.id}/lines`).subscribe({next:rows=>this.invoiceLines.set(rows||[]),error:err=>this.fail('No se pudieron cargar líneas',err)}); }
  voidInvoice(f:Invoice|null){ if(!f || f.status==='anulada') return; if(!confirm(`¿Anular la factura ${f.invoice_code}?`)) return; this.http.post<Invoice>(`${API}/sales-invoices/${f.id}/void`,{reason:'Anulación desde Workspace Comercial'}).subscribe({next:inv=>{this.success('Factura anulada',`${inv.invoice_code} fue anulada.`); this.loadAll(); this.selectedInvoice.set(inv);},error:err=>this.fail('No se pudo anular factura',err)}); }
  invoiceExit(e:Exit){ this.http.post<Invoice>(`${API}/warehouse-exits/${e.id}/invoice`,{warehouse_exit_id:e.id,notes:'Facturada desde Workspace Comercial'}).subscribe({next:inv=>{this.success('Salida facturada',`Se generó ${inv.invoice_code}.`); this.tab.set('facturas'); this.selectedInvoice.set(inv); this.loadAll(); this.loadInvoiceLines(inv);},error:err=>this.fail('No se pudo facturar salida',err)}); }
  printInvoice(f:Invoice|null){ if(!f) return; const lines=this.invoiceLines(); const html=`<html><head><title>${f.invoice_code}</title><style>body{font-family:Arial;padding:24px}h1{margin:0}.box{border:1px solid #ddd;border-radius:12px;padding:12px;margin:12px 0}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left}.total{text-align:right;font-size:22px}</style></head><body><h1>Intermotores</h1><p>Factura ${f.invoice_code}</p><div class="box"><strong>Cliente:</strong> ${f.client_name}<br><strong>NIT:</strong> ${f.client_tax_id}<br><strong>Estado:</strong> ${f.status}</div><table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${lines.map(l=>`<tr><td>${l.description}</td><td>${l.quantity}</td><td>Q ${this.money(l.unit_price)}</td><td>Q ${this.money(l.total_line)}</td></tr>`).join('')}</tbody></table><p class="total"><strong>Total Q ${this.money(f.total)}</strong></p><p>Gracias por su compra.</p></body></html>`; const w=window.open('','','width=900,height=700'); if(w){w.document.write(html); w.document.close(); w.print();} }
  printCommercialSummary(){ const html=`<html><head><title>Resumen comercial</title><style>body{font-family:Arial;padding:24px}.k{display:inline-block;border:1px solid #ddd;border-radius:12px;padding:16px;margin:8px}</style></head><body><h1>Resumen Comercial - Intermotores</h1><div class="k">Facturas: <b>${this.activeInvoices().length}</b></div><div class="k">Total: <b>Q ${this.money(this.totalInvoices())}</b></div><div class="k">Salidas pendientes: <b>${this.pendingExits().length}</b></div><div class="k">Clientes: <b>${this.customers().length}</b></div></body></html>`; const w=window.open('','','width=800,height=600'); if(w){w.document.write(html); w.document.close(); w.print();} }
  paymentCount(method:string){ return this.invoices().filter(f=>(f.notes||'').toLowerCase().includes(`método de pago: ${method}`)).length; }
  showToast(msg:string){ this.toast.set(msg); setTimeout(()=>this.toast.set(''),2500); }
  success(title:string,message:string){ this.alert.set({type:'success',title,message}); }
  warn(title:string,message:string){ this.alert.set({type:'warning',title,message}); }
  fail(title:string,err:any){ const detail=err?.error?.detail || err?.message || 'Error desconocido'; this.alert.set({type:'danger',title,message:'La operación no se pudo completar.',detail: typeof detail === 'string' ? detail : JSON.stringify(detail)}); this.loading.set(false); this.busy.set(false); }
}
