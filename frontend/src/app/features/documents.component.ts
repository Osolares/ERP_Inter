import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1';

type DocType = 'facturas' | 'compras' | 'salidas' | 'cobros' | 'caja' | 'plantillas';
type TimelineItem = { icon: string; title: string; detail: string; date?: string };

type DocRow = {
  id: number;
  type: DocType;
  icon: string;
  code: string;
  party: string;
  status: string;
  total: number;
  date?: string;
  origin?: string;
  raw: any;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="documents-hero">
      <div>
        <span class="eyebrow">🖨️ ERP v15.4.0 · Workspace Documentos</span>
        <h1>Documentos e Impresión Profesional</h1>
        <p>Centro unificado para facturas, compras, salidas, cobros, caja, plantillas, impresión y timeline documental.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" (click)="loadAll()" [disabled]="loading()">🔄 Actualizar</button>
        <button class="btn primary" (click)="printDocument(selected())" [disabled]="!selected()">🖨️ Imprimir seleccionado</button>
      </div>
    </section>

    <section class="workspace-toolbar">
      <button class="tool" [class.active]="tab()==='resumen'" (click)="tab.set('resumen')">📊 Resumen</button>
      <button class="tool" [class.active]="tab()==='facturas'" (click)="tab.set('facturas')">🧾 Facturas</button>
      <button class="tool" [class.active]="tab()==='compras'" (click)="tab.set('compras')">📥 Compras</button>
      <button class="tool" [class.active]="tab()==='salidas'" (click)="tab.set('salidas')">🚚 Salidas</button>
      <button class="tool" [class.active]="tab()==='cobros'" (click)="tab.set('cobros')">💳 Cobros</button>
      <button class="tool" [class.active]="tab()==='caja'" (click)="tab.set('caja')">💵 Caja</button>
      <button class="tool" [class.active]="tab()==='plantillas'" (click)="tab.set('plantillas')">🎨 Plantillas</button>
    </section>

    <section class="doc-search">
      <div>
        <strong>🔎 Búsqueda documental</strong>
        <p>Busca por código, cliente, proveedor, estado, origen o monto.</p>
      </div>
      <input [(ngModel)]="search" placeholder="FAC, COMP, SAL, COB, cliente, proveedor..." />
    </section>

    <section class="doc-kpis">
      <button class="doc-kpi" (click)="tab.set('facturas')"><span>Facturas</span><strong>{{ count('facturas') }}</strong><small>Documentos de venta</small></button>
      <button class="doc-kpi" (click)="tab.set('compras')"><span>Compras</span><strong>{{ count('compras') }}</strong><small>Documentos de ingreso</small></button>
      <button class="doc-kpi" (click)="tab.set('salidas')"><span>Salidas</span><strong>{{ count('salidas') }}</strong><small>Entrega física</small></button>
      <button class="doc-kpi" (click)="tab.set('cobros')"><span>Cobros</span><strong>{{ count('cobros') }}</strong><small>Recibos y abonos</small></button>
      <button class="doc-kpi" (click)="tab.set('plantillas')"><span>Plantillas</span><strong>{{ templates.length }}</strong><small>Formatos base</small></button>
    </section>

    <section class="documents-layout">
      <article class="card doc-main">
        <div class="section-head">
          <div>
            <h3>{{ titleForTab() }}</h3>
            <p class="muted">Vista unificada con impresión, PDF futuro, timeline, adjuntos y comentarios.</p>
          </div>
          <button class="btn" (click)="printSummary()">📄 Resumen</button>
        </div>

        <div class="template-grid" *ngIf="tab()==='plantillas'">
          <article class="template-card" *ngFor="let t of templates" [class.selected]="selectedTemplate().id===t.id" (click)="selectedTemplate.set(t)">
            <span>{{ t.icon }}</span>
            <h4>{{ t.name }}</h4>
            <p>{{ t.description }}</p>
            <small>{{ t.size }} · {{ t.variables.length }} variables</small>
          </article>
        </div>

        <div class="operations" *ngIf="tab()==='resumen'">
          <button class="operation" (click)="tab.set('facturas')">🧾 <strong>{{ count('facturas') }}</strong><span>Facturas para imprimir</span></button>
          <button class="operation" (click)="tab.set('compras')">📥 <strong>{{ count('compras') }}</strong><span>Compras documentadas</span></button>
          <button class="operation" (click)="tab.set('salidas')">🚚 <strong>{{ count('salidas') }}</strong><span>Salidas logísticas</span></button>
          <button class="operation" (click)="tab.set('cobros')">💳 <strong>{{ count('cobros') }}</strong><span>Cobros y recibos</span></button>
        </div>

        <div class="table-wrap" *ngIf="tab()!=='plantillas' && tab()!=='resumen'">
          <table>
            <thead>
              <tr><th>Documento</th><th>Persona / entidad</th><th>Estado</th><th>Total</th><th>Origen</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of filteredDocs()" [class.selected]="selected()?.type===d.type && selected()?.id===d.id" (click)="selected.set(d)">
                <td><strong>{{ d.icon }} {{ d.code }}</strong><br><small>{{ d.date || 'sin fecha' }}</small></td>
                <td>{{ d.party || 'No especificado' }}</td>
                <td><span class="doc-state">{{ d.status || 'activo' }}</span></td>
                <td>Q {{ money(d.total) }}</td>
                <td>{{ d.origin || '-' }}</td>
                <td class="row-actions">
                  <button class="btn small" (click)="$event.stopPropagation(); selected.set(d)">Ver</button>
                  <button class="btn small primary-inline" (click)="$event.stopPropagation(); printDocument(d)">Imprimir</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="card doc-context">
        <ng-container *ngIf="selected(); else templateContext">
          <div class="document-preview" id="document-preview">
            <div class="preview-head">
              <div>
                <h2>Intermotores</h2>
                <small>Guatemala · Documento interno ERP</small>
              </div>
              <strong>{{ selected()?.code }}</strong>
            </div>
            <div class="preview-meta">
              <span>Tipo</span><strong>{{ selected()?.type }}</strong>
              <span>Estado</span><strong>{{ selected()?.status }}</strong>
              <span>Persona</span><strong>{{ selected()?.party || 'N/A' }}</strong>
              <span>Total</span><strong>Q {{ money(selected()?.total) }}</strong>
            </div>
            <div class="preview-box">
              <strong>Vista previa</strong>
              <p>Plantilla base preparada para PDF, impresión profesional, WhatsApp, correo, adjuntos y FEL futuro.</p>
            </div>
          </div>

          <div class="context-actions">
            <button class="btn primary" (click)="printDocument(selected())">🖨️ Imprimir</button>
            <button class="btn" (click)="showVariables = !showVariables">{{ showVariables ? 'Ocultar' : 'Ver' }} variables</button>
          </div>

          <section class="variables" *ngIf="showVariables">
            <h4>Variables disponibles</h4>
            <span *ngFor="let v of variables">{{ '{{' }}{{ v }}{{ '}}' }}</span>
          </section>

          <section class="timeline">
            <h4>🕓 SmartTimeline</h4>
            <div class="event" *ngFor="let e of timelineForSelected()">
              <span>{{ e.icon }}</span>
              <div><strong>{{ e.title }}</strong><p>{{ e.detail }}</p><small>{{ e.date || '' }}</small></div>
            </div>
          </section>

          <section class="notes-box">
            <h4>📎 Adjuntos y comentarios</h4>
            <p class="muted">Base preparada para PDF, XML, fotos, archivos, notas internas y auditoría documental.</p>
          </section>
        </ng-container>

        <ng-template #templateContext>
          <h3>🎨 Plantilla seleccionada</h3>
          <div class="template-detail">
            <span>{{ selectedTemplate().icon }}</span>
            <h4>{{ selectedTemplate().name }}</h4>
            <p>{{ selectedTemplate().description }}</p>
            <strong>{{ selectedTemplate().size }}</strong>
          </div>
          <h4>Variables</h4>
          <section class="variables"><span *ngFor="let v of selectedTemplate().variables">{{ '{{' }}{{ v }}{{ '}}' }}</span></section>
          <button class="btn primary" (click)="printTemplate()">🧾 Vista previa</button>
        </ng-template>
      </aside>
    </section>
  `,
  styles: [`
    :host{display:block}.documents-hero{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:28px;border-radius:28px;background:linear-gradient(135deg,#111827,#7c2d12);color:white;margin-bottom:18px;box-shadow:0 20px 50px rgba(124,45,18,.22)}.documents-hero h1{font-size:34px;margin:6px 0}.documents-hero p{max-width:820px;opacity:.9}.hero-actions,.context-actions,.row-actions{display:flex;gap:10px;flex-wrap:wrap}.workspace-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.tool{border:1px solid var(--border);background:var(--surface);color:var(--text);padding:10px 13px;border-radius:14px;font-weight:800;cursor:pointer}.tool.active{background:var(--primary);color:white;border-color:var(--primary)}.btn{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:14px;padding:10px 14px;cursor:pointer;font-weight:800}.btn.primary,.primary-inline{background:var(--primary);color:white;border-color:var(--primary)}.btn.small{padding:7px 10px;font-size:12px}.doc-search{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:16px;margin:14px 0}.doc-search input{width:min(540px,55vw)}.doc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}.doc-kpi{display:flex;flex-direction:column;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:16px;cursor:pointer;color:var(--text)}.doc-kpi strong{font-size:26px}.doc-kpi small,.muted{color:var(--muted)}.documents-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(360px,.9fr);gap:16px}.doc-context{position:sticky;top:16px;align-self:start}.section-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.template-grid,.operations{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.template-card,.operation{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:16px;color:var(--text);text-align:left;cursor:pointer}.template-card.selected{outline:3px solid rgba(15,98,254,.28)}.template-card span,.operation{font-size:26px}.operation{display:flex;flex-direction:column;gap:6px}.operation strong{font-size:28px}.table-wrap{overflow:auto;border:1px solid var(--border);border-radius:16px}table{width:100%;border-collapse:collapse}th,td{padding:11px 12px;border-bottom:1px solid var(--border);text-align:left}tbody tr{cursor:pointer}tbody tr.selected{background:rgba(15,98,254,.10)}.doc-state{display:inline-flex;border-radius:999px;padding:6px 10px;background:rgba(15,98,254,.10);font-weight:800}.document-preview{border:1px solid var(--border);border-radius:22px;padding:16px;background:linear-gradient(180deg,var(--surface),rgba(15,98,254,.04))}.preview-head{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);padding-bottom:12px}.preview-head h2{margin:0}.preview-meta{display:grid;grid-template-columns:1fr auto;gap:8px;margin:14px 0}.preview-meta span{color:var(--muted)}.preview-box,.notes-box,.template-detail{border:1px dashed var(--border);border-radius:16px;padding:14px;background:rgba(102,112,133,.08);margin:12px 0}.variables{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.variables span{border:1px solid var(--border);border-radius:999px;padding:6px 10px;background:rgba(15,98,254,.08);font-size:12px;font-weight:800}.timeline{margin-top:16px}.event{display:grid;grid-template-columns:42px 1fr;gap:10px;border:1px solid var(--border);border-radius:16px;padding:12px;margin-bottom:10px}.event>span{font-size:24px}@media(max-width:1100px){.documents-layout{grid-template-columns:1fr}.doc-context{position:static}.documents-hero,.doc-search,.section-head{display:block}.hero-actions{margin-top:12px}.doc-search input{width:100%;margin-top:10px}}@media print{body *{visibility:hidden}.document-preview,.document-preview *{visibility:visible}.document-preview{position:absolute;left:0;top:0;width:100%;box-shadow:none;border:0}}
  `]
})
export class DocumentsComponent {
  private http = inject(HttpClient);
  loading = signal(false);
  tab = signal<DocType | 'resumen'>('resumen');
  selected = signal<DocRow | null>(null);
  search = '';
  showVariables = false;
  rows = signal<DocRow[]>([]);

  variables = ['empresa','cliente','nit','fecha','documento','estado','productos','subtotal','iva','total','codigo_qr','codigo_barras','usuario','observaciones'];

  templates = [
    { id: 1, icon: '🧾', name: 'Factura carta', size: 'Carta', description: 'Formato profesional para factura interna y FEL futuro.', variables: ['empresa','cliente','nit','productos','total','codigo_qr'] },
    { id: 2, icon: '🧾', name: 'Ticket POS', size: '80 mm', description: 'Ticket compacto para ventas rápidas desde POS.', variables: ['empresa','cliente','productos','total','recibido','vuelto'] },
    { id: 3, icon: '🚚', name: 'Salida de bodega', size: 'Media carta', description: 'Documento logístico para entrega física.', variables: ['cliente','bodega','productos','responsable','firma'] },
    { id: 4, icon: '📥', name: 'Compra / recepción', size: 'Carta', description: 'Documento de compra con lotes y costos con IVA incluido.', variables: ['proveedor','productos','lotes','costos','total'] },
    { id: 5, icon: '💳', name: 'Recibo de cobro', size: 'Media carta', description: 'Comprobante de abonos, anticipos y pagos.', variables: ['cliente','factura','monto','metodo','saldo'] },
    { id: 6, icon: '🏷️', name: 'Etiqueta lote', size: 'Etiqueta', description: 'Etiqueta con código de barras, QR, SKU y lote.', variables: ['sku','lote','producto','qr','codigo_barras'] },
  ];

  selectedTemplate = signal(this.templates[0]);

  constructor(){ this.loadAll(); }

  loadAll(){
    this.loading.set(true);
    Promise.all([this.loadInvoices(), this.loadPurchases(), this.loadExits(), this.loadPayments(), this.loadCash()]).finally(()=>this.loading.set(false));
  }

  loadInvoices(){ return new Promise<void>(resolve => this.http.get<any[]>(`${API}/inventory/sales-invoices`).subscribe({ next: data => { this.mergeRows(data.map(x => ({ id:x.id, type:'facturas' as DocType, icon:'🧾', code:x.invoice_code || ('FAC-'+x.id), party:x.client_name || 'Consumidor final', status:x.status || 'registrada', total:Number(x.total || 0), date:x.created_at, origin:x.origin || 'directa', raw:x }))); resolve(); }, error:()=>resolve() })); }
  loadPurchases(){ return new Promise<void>(resolve => this.http.get<any[]>(`${API}/inventory/purchases`).subscribe({ next: data => { this.mergeRows(data.map(x => ({ id:x.id, type:'compras' as DocType, icon:'📥', code:x.purchase_code || x.document_number || ('COMP-'+x.id), party:x.supplier_name || 'Proveedor', status:x.status || 'borrador', total:Number(x.total || x.total_amount || 0), date:x.created_at, origin:'compra', raw:x }))); resolve(); }, error:()=>resolve() })); }
  loadExits(){ return new Promise<void>(resolve => this.http.get<any[]>(`${API}/inventory/warehouse-exits`).subscribe({ next: data => { this.mergeRows(data.map(x => ({ id:x.id, type:'salidas' as DocType, icon:'🚚', code:x.exit_code || ('SAL-'+x.id), party:x.client_name || 'Cliente', status:x.status || 'pendiente', total:Number(x.total || 0), date:x.created_at, origin:'bodega', raw:x }))); resolve(); }, error:()=>resolve() })); }
  loadPayments(){ return new Promise<void>(resolve => this.http.get<any[]>(`${API}/financial/payments`).subscribe({ next: data => { this.mergeRows(data.map(x => ({ id:x.id, type:'cobros' as DocType, icon:'💳', code:x.payment_code || ('COB-'+x.id), party:x.customer_name || 'Cliente', status:x.status || 'registrado', total:Number(x.amount || 0), date:x.created_at, origin:x.method || 'cobro', raw:x }))); resolve(); }, error:()=>resolve() })); }
  loadCash(){ return new Promise<void>(resolve => this.http.get<any[]>(`${API}/financial/cash-sessions`).subscribe({ next: data => { this.mergeRows(data.map(x => ({ id:x.id, type:'caja' as DocType, icon:'💵', code:x.session_code || ('CAJA-'+x.id), party:x.cashier_name || 'Caja', status:x.status || 'abierta', total:Number(x.expected_amount || 0), date:x.created_at, origin:'caja diaria', raw:x }))); resolve(); }, error:()=>resolve() })); }

  mergeRows(newRows: DocRow[]){
    const others = this.rows().filter(r => !newRows.some(n => n.type === r.type));
    this.rows.set([...others, ...newRows].sort((a,b) => (b.id || 0) - (a.id || 0)));
  }

  filteredDocs(){
    const term = this.search.trim().toLowerCase();
    const t = this.tab();
    return this.rows().filter(r => (t === 'resumen' || t === r.type) && (!term || `${r.code} ${r.party} ${r.status} ${r.origin}`.toLowerCase().includes(term)));
  }

  count(type: DocType){ return this.rows().filter(r => r.type === type).length; }
  money(value:any){ return Number(value || 0).toFixed(2); }

  titleForTab(){
    const map:any = { resumen:'📊 Centro documental', facturas:'🧾 Facturas', compras:'📥 Compras', salidas:'🚚 Salidas', cobros:'💳 Cobros', caja:'💵 Caja diaria', plantillas:'🎨 Plantillas configurables' };
    return map[this.tab()] || 'Documentos';
  }

  timelineForSelected(): TimelineItem[]{
    const d = this.selected();
    if(!d) return [];
    return [
      { icon: d.icon, title: `${d.code} creado`, detail: `${d.party} · Estado ${d.status}`, date: d.date },
      { icon: '📝', title: 'Auditoría preparada', detail: 'Cambio de estados, usuario, fecha, IP y valores anteriores/listos para registrar.' },
      { icon: '🖨️', title: 'Impresión disponible', detail: 'Documento listo para plantilla, vista previa, PDF futuro, correo y WhatsApp.' },
      { icon: '📎', title: 'Adjuntos preparados', detail: 'Base para PDF, XML, fotos, comprobantes y comentarios internos.' },
    ];
  }

  printDocument(doc: DocRow | null){
    if(!doc) return;
    this.selected.set(doc);
    setTimeout(() => window.print(), 80);
  }

  printSummary(){ window.print(); }
  printTemplate(){ window.print(); }
}
