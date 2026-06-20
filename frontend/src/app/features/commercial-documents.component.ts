import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/inventory';
const AUTO = 'http://localhost:8000/api/v1/automotive';

type Product = { id:number; sku:string; name:string; condition:string; product_type:string; category_name?:string; product_category_name?:string; engine_series_name?:string; fuel_type?:string; displacement_cc?:string; cylinders?:string; oem_primary?:string; price_sale:any; price_offer:any; };
type Lot = { id:number; product_id:number; lot_code:string; physical_qty:any; accounting_qty:any; available_physical:any; available_accounting:any; unit_cost:any; sale_price:any; special_lot_price:any; location:string; is_blocked:boolean; is_sellable:boolean; is_out_of_accounting_inventory:boolean; inventory_status:string; engine_number?:string; serial_number?:string; import_policy_number?:string; import_port?:string; import_date?:string; };
type Customer = { id:number; name:string; tax_id:string; phone:string; email:string; address:string; discount_percent:any; price_type:string; notes:string; };
type Invoice = { id:number; invoice_code:string; source_exit_id:number|null; client_name:string; client_tax_id:string; status:string; subtotal:any; tax_total:any; total:any; notes:string; internal_notes:string; is_active:boolean; };
type InvoiceLine = { id:number; invoice_id:number; product_id:number; lot_id:number|null; description:string; quantity:any; unit_price:any; tax_rate:any; total_line:any; affects_physical:boolean; affects_accounting:boolean; notes:string; };
type Exit = { id:number; exit_code:string; client_name:string; client_tax_id:string; status:string; is_invoiced:boolean; invoice_reference:string; total_reference:any; notes:string; internal_notes:string; };
type QuoteLine = { lot_id:number|null; product_id:number|null; sku:string; product_name:string; lot_code:string; description:string; quantity:number; unit_price:number; discount_percent:number; tax_rate:number; };
type Quote = { id:string; quote_code:string; client_name:string; client_tax_id:string; status:string; created_at:string; notes:string; internal_notes:string; general_discount_percent:number; lines:QuoteLine[]; };
type SortState = { key:string; dir:'asc'|'desc' };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="hero">
      <div>
        <span class="eyebrow">💼 ERP v16.9.0 · Documentos comerciales</span>
        <h1>Facturación, Salidas y Cotizaciones Pro</h1>
        <p>Tablas amplias estilo v13, filtros combinables, descripciones automáticas por categoría y documentos preparados para operar rápido.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" (click)="loadAll()">🔄 Actualizar</button>
        <button class="btn primary" (click)="openQuoteBuilder()">➕ Nueva cotización</button>
        <button class="btn" (click)="printCurrent()">🖨️ Imprimir vista</button>
      </div>
    </section>

    <section class="tabs">
      <button class="tab" [class.active]="view()==='invoices'" (click)="view.set('invoices')">🧾 Facturación</button>
      <button class="tab" [class.active]="view()==='exits'" (click)="view.set('exits')">🚚 Salidas</button>
      <button class="tab" [class.active]="view()==='quotes'" (click)="view.set('quotes')">📋 Cotizaciones</button>
      <button class="tab" [class.active]="view()==='templates'" (click)="view.set('templates')">🧩 Plantillas</button>
    </section>

    <section class="filters card">
      <div>
        <label>Búsqueda global</label>
        <input [(ngModel)]="search" placeholder="SKU, lote, cliente, NIT, número documento..." />
      </div>
      <div>
        <label>Estado</label>
        <select [(ngModel)]="statusFilter">
          <option value="">Todos</option>
          <option value="activa">Activa</option>
          <option value="registrada">Registrada</option>
          <option value="pendiente">Pendiente</option>
          <option value="borrador">Borrador</option>
          <option value="facturada">Facturada</option>
          <option value="anulada">Anulada</option>
        </select>
      </div>
      <div>
        <label>Cliente</label>
        <input [(ngModel)]="customerFilter" placeholder="Consumidor, empresa, NIT..." />
      </div>
      <div>
        <label>Ordenamiento</label>
        <span class="sort-pill">{{ sort().key || 'sin orden' }} {{ sort().dir }}</span>
      </div>
    </section>

    <section class="kpis">
      <button class="kpi" (click)="view.set('invoices')"><span>Facturas</span><strong>{{ filteredInvoices().length }}</strong><small>Total Q {{ money(invoiceTotal()) }}</small></button>
      <button class="kpi" (click)="view.set('exits')"><span>Salidas pendientes</span><strong>{{ pendingExits().length }}</strong><small>Por facturar</small></button>
      <button class="kpi" (click)="view.set('quotes')"><span>Cotizaciones</span><strong>{{ filteredQuotes().length }}</strong><small>Locales hasta API final</small></button>
      <button class="kpi warning"><span>Plantillas</span><strong>{{ templates.length }}</strong><small>Descripción por categoría</small></button>
    </section>

    <section class="table-shell card" *ngIf="view()==='invoices'">
      <div class="section-head"><h2>🧾 Facturación detallada</h2><small>Click en encabezado para ordenar.</small></div>
      <div class="wide-table">
        <table>
          <thead><tr>
            <th (click)="setSort('invoice_code')">Documento</th><th (click)="setSort('client_name')">Cliente</th><th>NIT</th><th (click)="setSort('status')">Estado</th><th>Origen</th><th>Subtotal</th><th>IVA</th><th (click)="setSort('total')">Total</th><th>Notas</th><th class="sticky-action">Acciones</th>
          </tr></thead>
          <tbody>
            <tr *ngFor="let f of filteredInvoices()" [class.selected]="selectedInvoice()?.id===f.id" (click)="selectInvoice(f)">
              <td><strong>{{ f.invoice_code }}</strong></td><td>{{ f.client_name }}</td><td>{{ f.client_tax_id }}</td><td><span class="state" [class.void]="f.status==='anulada'">{{ f.status }}</span></td><td>{{ f.source_exit_id ? 'Salida' : 'Directa/POS' }}</td><td>Q {{ money(f.subtotal) }}</td><td>Q {{ money(f.tax_total) }}</td><td><strong>Q {{ money(f.total) }}</strong></td><td>{{ f.notes }}</td><td class="sticky-action"><button class="btn small" (click)="$event.stopPropagation(); printInvoice(f)">🖨️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <aside class="context" *ngIf="selectedInvoice()">
        <h3>Detalle {{ selectedInvoice()?.invoice_code }}</h3>
        <div class="line" *ngFor="let l of invoiceLines()"><span>{{ l.description }}</span><strong>{{ l.quantity }} x Q {{ money(l.unit_price) }}</strong></div>
      </aside>
    </section>

    <section class="table-shell card" *ngIf="view()==='exits'">
      <div class="section-head"><h2>🚚 Salidas detalladas</h2><small>Preparadas para facturación posterior sin doble descuento físico.</small></div>
      <div class="wide-table"><table>
        <thead><tr><th (click)="setSort('exit_code')">Salida</th><th>Cliente</th><th>NIT</th><th>Estado</th><th>Facturada</th><th>Factura</th><th>Total ref.</th><th>Notas</th><th class="sticky-action">Acciones</th></tr></thead>
        <tbody><tr *ngFor="let e of filteredExits()">
          <td><strong>{{ e.exit_code }}</strong></td><td>{{ e.client_name }}</td><td>{{ e.client_tax_id }}</td><td><span class="state">{{ e.status }}</span></td><td>{{ e.is_invoiced ? 'Sí' : 'No' }}</td><td>{{ e.invoice_reference }}</td><td>Q {{ money(e.total_reference) }}</td><td>{{ e.notes }}</td><td class="sticky-action"><button class="btn small primary" [disabled]="e.is_invoiced" (click)="invoiceExit(e)">Facturar</button></td>
        </tr></tbody>
      </table></div>
    </section>

    <section class="table-shell card" *ngIf="view()==='quotes'">
      <div class="section-head"><h2>📋 Cotizaciones detalladas</h2><button class="btn primary" (click)="openQuoteBuilder()">➕ Nueva cotización</button></div>
      <div class="wide-table"><table>
        <thead><tr><th (click)="setSort('quote_code')">Cotización</th><th>Cliente</th><th>NIT</th><th>Estado</th><th>Fecha</th><th>Líneas</th><th>Total</th><th>Notas</th><th class="sticky-action">Acciones</th></tr></thead>
        <tbody><tr *ngFor="let q of filteredQuotes()" [class.selected]="selectedQuote()?.id===q.id" (click)="selectedQuote.set(q)">
          <td><strong>{{ q.quote_code }}</strong></td><td>{{ q.client_name }}</td><td>{{ q.client_tax_id }}</td><td><span class="state">{{ q.status }}</span></td><td>{{ q.created_at | date:'dd/MM/yyyy HH:mm' }}</td><td>{{ q.lines.length }}</td><td>Q {{ money(quoteTotal(q)) }}</td><td>{{ q.notes }}</td><td class="sticky-action"><button class="btn small" (click)="$event.stopPropagation(); printQuote(q)">🖨️</button><button class="btn small primary" (click)="$event.stopPropagation(); quoteToInvoice(q)">Facturar</button></td>
        </tr></tbody>
      </table></div>
    </section>

    <section class="card" *ngIf="view()==='templates'">
      <h2>🧩 Plantillas de descripción por categoría</h2>
      <p class="muted">Base inspirada en v13: formato genérico y formatos especiales por categoría. En próximas versiones vivirán en Configuración.</p>
      <div class="template-grid">
        <article class="template" *ngFor="let t of templates"><strong>{{ t.category }}</strong><pre>{{ t.body }}</pre></article>
      </div>
    </section>

    <aside class="drawer" *ngIf="quoteDrawer()">
      <div class="drawer-head"><h2>📋 Cotización / Documento comercial</h2><button class="btn" (click)="quoteDrawer.set(false)">Cerrar</button></div>
      <div class="drawer-grid">
        <label>Cliente<input [(ngModel)]="draft.client_name" /></label>
        <label>NIT<input [(ngModel)]="draft.client_tax_id" /></label>
        <label>Descuento general %<input type="number" [(ngModel)]="draft.general_discount_percent" /></label>
        <label>Estado<select [(ngModel)]="draft.status"><option>borrador</option><option>enviada</option><option>aprobada</option><option>rechazada</option></select></label>
      </div>
      <label>Notas<textarea [(ngModel)]="draft.notes"></textarea></label>
      <div class="line-builder card soft">
        <h3>Agregar línea</h3>
        <div class="drawer-grid">
          <label>Producto / lote
            <select [(ngModel)]="selectedLotId" (ngModelChange)="prepareLineFromLot()">
              <option [ngValue]="null">Seleccionar lote disponible</option>
              <option *ngFor="let l of saleableLots()" [ngValue]="l.id">{{ productById(l.product_id)?.sku }} · {{ l.lot_code }} · Disp. {{ l.available_physical }}</option>
            </select>
          </label>
          <label>Cantidad<input type="number" [(ngModel)]="draftLine.quantity" /></label>
          <label>Precio<input type="number" [(ngModel)]="draftLine.unit_price" /></label>
          <label>Desc. %<input type="number" [(ngModel)]="draftLine.discount_percent" /></label>
        </div>
        <label>Descripción inteligente editable<textarea rows="4" [(ngModel)]="draftLine.description"></textarea></label>
        <button class="btn primary" (click)="addDraftLine()">➕ Agregar línea</button>
      </div>
      <div class="wide-table"><table><thead><tr><th>SKU</th><th>Lote</th><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Desc.</th><th>Total</th><th></th></tr></thead><tbody><tr *ngFor="let l of draft.lines; let i=index"><td>{{ l.sku }}</td><td>{{ l.lot_code }}</td><td>{{ l.description }}</td><td>{{ l.quantity }}</td><td>Q {{ money(l.unit_price) }}</td><td>{{ l.discount_percent }}%</td><td>Q {{ money(lineTotal(l)) }}</td><td><button class="btn small danger" (click)="draft.lines.splice(i,1)">✕</button></td></tr></tbody></table></div>
      <div class="totals"><span>Subtotal</span><strong>Q {{ money(draftSubtotal()) }}</strong><span>Descuento general</span><strong>{{ draft.general_discount_percent }}%</strong><span>Total</span><strong>Q {{ money(quoteTotal(draft)) }}</strong></div>
      <div class="hero-actions"><button class="btn primary" (click)="saveQuote()">💾 Guardar cotización</button><button class="btn" (click)="printQuote(draft)">🖨️ Vista previa</button></div>
    </aside>
  `,
  styles: [`
    :host{display:block}.hero{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:28px;border-radius:26px;background:linear-gradient(135deg,#1e293b,#0f766e);color:white;margin-bottom:16px;box-shadow:0 20px 50px rgba(15,23,42,.18)}h1{margin:6px 0;font-size:32px}.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:12px;opacity:.85}.hero-actions,.tabs{display:flex;gap:10px;flex-wrap:wrap}.btn,.tab{border:1px solid var(--border,#d8dee9);background:var(--surface-card,#fff);color:var(--text,#111827);border-radius:14px;padding:10px 14px;font-weight:800;cursor:pointer}.btn.primary,.tab.active{background:#0f766e;color:white;border-color:#0f766e}.btn.small{padding:7px 9px;font-size:12px}.btn.danger{background:color-mix(in srgb,var(--surface-card,#fff) 80%,#dc2626 20%);color:var(--danger,#991b1b)}.card{background:var(--surface-card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:22px;padding:16px;box-shadow:0 12px 32px rgba(15,23,42,.06);margin:14px 0}.soft{background:color-mix(in srgb,var(--surface-card,#fff) 92%,#0f766e 8%)}.filters{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end}.filters input,.filters select,input,select,textarea{background:var(--surface-card,#fff);color:var(--text,#111827);border:1px solid var(--border,#d1d5db);border-radius:12px;padding:10px}label{display:flex;flex-direction:column;gap:6px;font-weight:800}.kpis{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:12px}.kpi{display:flex;flex-direction:column;text-align:left;border:1px solid var(--border,#e5e7eb);background:var(--surface-card,#fff);color:var(--text,#111827);border-radius:18px;padding:16px;cursor:pointer}.kpi strong{font-size:28px}.kpi small,.muted{color:var(--muted,#64748b)}.warning strong{color:#b45309}.section-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.wide-table{overflow:auto;max-width:100%;border-radius:16px;border:1px solid var(--border,#e5e7eb)}table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;background:var(--surface-card,var(--surface,#fff));color:var(--text,#111827)}th,td{padding:11px 12px;border-bottom:1px solid var(--border,#e5e7eb);text-align:left;white-space:nowrap}th{position:sticky;top:0;background:color-mix(in srgb,var(--surface-card,#fff) 88%,#0f766e 12%);z-index:3;cursor:pointer}tr.selected{background:color-mix(in srgb,#0f766e 12%,transparent)}.sticky-action{position:sticky;right:0;background:var(--surface-card,#fff);z-index:4}.state,.sort-pill{display:inline-flex;border-radius:999px;background:color-mix(in srgb,var(--surface-card,#fff) 80%,#16a34a 20%);color:var(--success,#166534);padding:5px 9px;font-weight:800}.state.void{background:color-mix(in srgb,var(--surface-card,#fff) 80%,#dc2626 20%);color:var(--danger,#991b1b)}.context{border-top:1px solid var(--border,#e5e7eb);margin-top:16px;padding-top:12px}.line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed var(--border,#e5e7eb);padding:8px 0}.template-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.template{border:1px solid var(--border,#e5e7eb);border-radius:16px;padding:14px;background:color-mix(in srgb,var(--surface-card,#fff) 94%,#0f766e 6%)}pre{white-space:pre-wrap;font-family:inherit}.drawer{position:fixed;right:0;top:0;width:min(920px,96vw);height:100vh;overflow:auto;background:var(--surface,#f8fafc);color:var(--text,#111827);z-index:80;padding:22px;box-shadow:-20px 0 60px rgba(0,0,0,.25)}.drawer-head{display:flex;justify-content:space-between;align-items:center}.drawer-grid{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px}.totals{display:grid;grid-template-columns:1fr auto;gap:10px;background:var(--surface-card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:16px;padding:14px;margin-top:12px}@media(max-width:1000px){.hero,.section-head{display:block}.filters,.kpis,.drawer-grid{grid-template-columns:1fr}.drawer{width:100vw}.sticky-action{position:static}}
  `]
})
export class CommercialDocumentsComponent {
  private http = inject(HttpClient);
  view = signal<'invoices'|'exits'|'quotes'|'templates'>(this.initialView());
  search=''; statusFilter=''; customerFilter='';
  sort = signal<SortState>({key:'',dir:'asc'});
  products = signal<Product[]>([]); lots = signal<Lot[]>([]); customers = signal<Customer[]>([]); invoices = signal<Invoice[]>([]); exits = signal<Exit[]>([]);
  selectedInvoice = signal<Invoice|null>(null); invoiceLines = signal<InvoiceLine[]>([]);
  quotes = signal<Quote[]>(this.loadQuotes()); selectedQuote = signal<Quote|null>(null); quoteDrawer = signal(false);
  selectedLotId:number|null=null;
  draft: Quote = this.emptyQuote();
  draftLine: QuoteLine = this.emptyLine();
  templates = [
    {category:'Genérica', body:'{{sku}} {{producto}} {{condicion}}\nLote: {{lote}}\nOEM: {{oem}}'},
    {category:'Motor', body:'Motor {{serie_motor}} {{combustible}} {{cc}}cc\nNo. motor: {{numero_motor}}\nPóliza: {{poliza}}\nPuerto: {{puerto}}'},
    {category:'Culata', body:'Culata {{serie_motor}} {{combustible}}\nOEM: {{oem}}\nCompatible con: {{compatibilidades}}'},
    {category:'Turbo', body:'Turbo para {{serie_motor}}\nOEM: {{oem}}\nEstado: {{condicion}}'}
  ];
  constructor(){ this.loadAll(); }
  initialView(){ const path=location.pathname; if(path.includes('salidas')) return 'exits'; if(path.includes('cotizaciones')) return 'quotes'; if(path.includes('plantillas')) return 'templates'; return 'invoices'; }
  loadAll(){ this.http.get<Product[]>(`${API}/products`).subscribe(r=>this.products.set(r||[])); this.http.get<Lot[]>(`${API}/lots`).subscribe(r=>this.lots.set(r||[])); this.http.get<Customer[]>(`${API}/customers`).subscribe(r=>this.customers.set(r||[])); this.http.get<Invoice[]>(`${API}/sales-invoices`).subscribe(r=>this.invoices.set(r||[])); this.http.get<Exit[]>(`${API}/warehouse-exits`).subscribe(r=>this.exits.set(r||[])); }
  productById(id:number|null|undefined){ return this.products().find(p=>p.id===id); }
  saleableLots(){ return this.lots().filter(l=>l.is_sellable && !l.is_blocked && this.num(l.available_physical)>0); }
  filteredInvoices = computed(()=>this.sortRows(this.invoices().filter(f=>this.match(`${f.invoice_code} ${f.client_name} ${f.client_tax_id} ${f.status} ${f.notes}`) && this.matchStatus(f.status) && this.matchCustomer(f.client_name,f.client_tax_id))));
  filteredExits = computed(()=>this.sortRows(this.exits().filter(e=>this.match(`${e.exit_code} ${e.client_name} ${e.client_tax_id} ${e.status} ${e.invoice_reference}`) && this.matchStatus(e.status) && this.matchCustomer(e.client_name,e.client_tax_id))));
  filteredQuotes = computed(()=>this.sortRows(this.quotes().filter(q=>this.match(`${q.quote_code} ${q.client_name} ${q.client_tax_id} ${q.status} ${q.notes}`) && this.matchStatus(q.status) && this.matchCustomer(q.client_name,q.client_tax_id))));
  pendingExits = computed(()=>this.exits().filter(e=>!e.is_invoiced && e.status!=='anulada'));
  invoiceTotal(){ return this.filteredInvoices().filter(f=>f.status!=='anulada').reduce((a,f)=>a+this.num(f.total),0); }
  match(text:string){ return !this.search.trim() || text.toLowerCase().includes(this.search.toLowerCase()); }
  matchStatus(status:string){ return !this.statusFilter || status.toLowerCase().includes(this.statusFilter.toLowerCase()); }
  matchCustomer(name:string,nit:string){ const q=this.customerFilter.trim().toLowerCase(); return !q || `${name} ${nit}`.toLowerCase().includes(q); }
  setSort(key:string){ const s=this.sort(); this.sort.set({key,dir:s.key===key && s.dir==='asc'?'desc':'asc'}); }
  sortRows<T extends any>(rows:T[]):T[]{ const s=this.sort(); if(!s.key) return rows; return [...rows].sort((a:any,b:any)=>{ const av=a[s.key]??'', bv=b[s.key]??''; const r=String(av).localeCompare(String(bv),undefined,{numeric:true}); return s.dir==='asc'?r:-r; }); }
  selectInvoice(f:Invoice){ this.selectedInvoice.set(f); this.http.get<InvoiceLine[]>(`${API}/sales-invoices/${f.id}/lines`).subscribe(r=>this.invoiceLines.set(r||[])); }
  invoiceExit(e:Exit){ this.http.post<Invoice>(`${API}/warehouse-exits/${e.id}/invoice`,{warehouse_exit_id:e.id,notes:'Facturada desde Facturación Pro v16.9.0'}).subscribe(()=>this.loadAll()); }
  openQuoteBuilder(){ this.draft=this.emptyQuote(); this.quoteDrawer.set(true); }
  emptyQuote():Quote{ return {id:crypto.randomUUID(), quote_code:`COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, client_name:'Consumidor final', client_tax_id:'CF', status:'borrador', created_at:new Date().toISOString(), notes:'', internal_notes:'', general_discount_percent:0, lines:[]}; }
  emptyLine():QuoteLine{ return {lot_id:null,product_id:null,sku:'',product_name:'',lot_code:'',description:'',quantity:1,unit_price:0,discount_percent:0,tax_rate:12}; }
  prepareLineFromLot(){ const lot=this.lots().find(l=>l.id===this.selectedLotId); if(!lot) return; const p=this.productById(lot.product_id); this.draftLine={lot_id:lot.id,product_id:lot.product_id,sku:p?.sku||'',product_name:p?.name||'',lot_code:lot.lot_code,description:'',quantity:1,unit_price:this.lotPrice(lot),discount_percent:0,tax_rate:12}; const req={sku:p?.sku||'', product_name:p?.name||'', condition:p?.condition||'', engine_series:p?.engine_series_name||'', oem:p?.oem_primary||'', lot_code:lot.lot_code, engine_number:lot.engine_number||'', notes:''}; this.http.post<any>(`${AUTO}/documents/description`,req).subscribe({next:r=>this.draftLine.description=r.description||this.localDescription(p,lot), error:()=>this.draftLine.description=this.localDescription(p,lot)}); }
  localDescription(p:Product|undefined,l:Lot){ return [`${p?.sku||''} ${p?.name||''}`.trim(), p?.condition, p?.engine_series_name?`Serie ${p.engine_series_name}`:'', p?.oem_primary?`OEM ${p.oem_primary}`:'', l.lot_code?`Lote ${l.lot_code}`:'', l.engine_number?`No. motor ${l.engine_number}`:''].filter(Boolean).join(' | '); }
  addDraftLine(){ if(!this.draftLine.product_id && !this.draftLine.description.trim()) return; this.draft.lines=[...this.draft.lines,{...this.draftLine}]; this.draftLine=this.emptyLine(); this.selectedLotId=null; }
  saveQuote(){ const rows=[this.draft,...this.quotes().filter(q=>q.id!==this.draft.id)]; this.quotes.set(rows); localStorage.setItem('erp_quotes_v1680',JSON.stringify(rows)); this.selectedQuote.set(this.draft); this.quoteDrawer.set(false); }
  loadQuotes():Quote[]{ try{return JSON.parse(localStorage.getItem('erp_quotes_v1680')||'[]')}catch{return[]} }
  quoteToInvoice(q:Quote){ if(!q.lines.length) return; const payload={client_name:q.client_name,client_tax_id:q.client_tax_id,notes:`Factura generada desde ${q.quote_code}`,internal_notes:q.internal_notes,lines:q.lines.filter(l=>l.lot_id).map(l=>({lot_id:l.lot_id,quantity:l.quantity,unit_price:this.lineNet(l,q),notes:`${q.quote_code} · ${l.description}`}))}; this.http.post<Invoice>(`${API}/sales-invoices/direct`,payload).subscribe(()=>{ q.status='facturada'; this.saveQuoteList(); this.view.set('invoices'); this.loadAll(); }); }
  saveQuoteList(){ this.quotes.set([...this.quotes()]); localStorage.setItem('erp_quotes_v1680',JSON.stringify(this.quotes())); }
  lineTotal(l:QuoteLine){ return this.num(l.quantity)*this.num(l.unit_price)*(1-this.num(l.discount_percent)/100); }
  lineNet(l:QuoteLine,q:Quote){ return +(this.num(l.unit_price)*(1-this.num(l.discount_percent)/100)*(1-this.num(q.general_discount_percent)/100)).toFixed(2); }
  quoteTotal(q:Quote){ const subtotal=q.lines.reduce((a,l)=>a+this.lineTotal(l),0); return Math.max(0, subtotal*(1-this.num(q.general_discount_percent)/100)); }
  draftSubtotal(){ return this.draft.lines.reduce((a,l)=>a+this.lineTotal(l),0); }
  lotPrice(l:Lot){ return this.num(l.special_lot_price)||this.num(l.sale_price)||this.num(this.productById(l.product_id)?.price_sale)||0; }
  printInvoice(f:Invoice){ const html=`<h1>Intermotores</h1><h2>Factura ${f.invoice_code}</h2><p>${f.client_name} · ${f.client_tax_id}</p><h2>Total Q ${this.money(f.total)}</h2>`; this.printHtml(html); }
  printQuote(q:Quote){ const rows=q.lines.map(l=>`<tr><td>${l.sku}</td><td>${l.description}</td><td>${l.quantity}</td><td>Q ${this.money(l.unit_price)}</td><td>Q ${this.money(this.lineTotal(l))}</td></tr>`).join(''); this.printHtml(`<h1>Intermotores</h1><h2>${q.quote_code}</h2><p>${q.client_name} · ${q.client_tax_id}</p><table>${rows}</table><h2>Total Q ${this.money(this.quoteTotal(q))}</h2>`); }
  printCurrent(){ this.printHtml(`<h1>Vista comercial ${this.view()}</h1><p>Facturas: ${this.filteredInvoices().length} · Salidas: ${this.filteredExits().length} · Cotizaciones: ${this.filteredQuotes().length}</p>`); }
  printHtml(body:string){ const w=window.open('','','width=900,height=700'); if(w){w.document.write(`<html><head><title>Intermotores</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px}</style></head><body>${body}</body></html>`); w.document.close(); w.print();} }
  num(v:any){ const n=Number(v); return Number.isFinite(n)?n:0; }
  money(v:any){ return this.num(v).toFixed(2); }
}
