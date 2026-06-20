import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1';

type OperationKPI = { key:string; label:string; value:any; group:string; severity:string; hint:string };
type OperationAlert = { id:string; title:string; description:string; severity:string; workspace:string; action:string };
type TimelineItem = { id:string; timestamp:string; title:string; detail:string; workspace:string; severity:string };
type OperationsDashboard = { version:string; generated_at:string; kpis:OperationKPI[]; alerts:OperationAlert[]; timeline:TimelineItem[] };
type AuditEntry = { id:number; created_at:string; action:string; entity_type:string; entity_id:string; detail:string; ip_address:string };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ops-hero">
      <div>
        <span class="eyebrow">🧭 ERP v15.6.0 · Auditoría / Logs / Centro de Operaciones</span>
        <h1>Centro de Operaciones</h1>
        <p>Alertas, eventos, trazabilidad y acciones importantes del ERP en una sola vista.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" (click)="load()" [disabled]="busy()">🔄 Actualizar</button>
        <button class="btn" (click)="exportAuditCsv()">📤 Auditoría CSV</button>
        <button class="btn primary compact-primary" (click)="print()">🖨️ Imprimir</button>
      </div>
    </section>

    <section class="ops-toolbar">
      <button class="tool" [class.active]="active()==='dashboard'" (click)="active.set('dashboard')">🧭 Operación</button>
      <button class="tool" [class.active]="active()==='alerts'" (click)="active.set('alerts')">⚠️ Alertas</button>
      <button class="tool" [class.active]="active()==='audit'" (click)="active.set('audit')">📜 Auditoría</button>
      <button class="tool" [class.active]="active()==='logs'" (click)="active.set('logs')">🧾 Logs técnicos</button>
      <input [(ngModel)]="search" placeholder="Buscar evento, alerta, entidad o acción..." />
    </section>

    <section class="kpi-grid ops-kpis">
      <button class="kpi" *ngFor="let k of filteredKpis()" [class.warn]="k.severity==='warning'" [class.ok]="k.severity==='success'" (click)="selectKpi(k)">
        <span>{{ k.group }}</span>
        <strong>{{ formatValue(k.value) }}</strong>
        <small>{{ k.label }}</small>
      </button>
    </section>

    <section class="ops-layout" *ngIf="active()==='dashboard'">
      <article class="card ops-main">
        <div class="section-head">
          <div>
            <h3>🧠 Operación del ERP</h3>
            <p>Resumen accionable de pendientes, riesgos operativos y actividad reciente.</p>
          </div>
          <span class="chip">Generado {{ generatedAt() }}</span>
        </div>
        <div class="alerts-grid">
          <button class="alert-tile" *ngFor="let a of filteredAlerts()" [class.warn]="a.severity==='warning'" [class.ok]="a.severity==='success'" (click)="selectedAlert.set(a)">
            <strong>{{ a.title }}</strong>
            <span>{{ a.workspace }}</span>
            <p>{{ a.description }}</p>
            <small>{{ a.action || 'Ver detalle' }}</small>
          </button>
        </div>
        <h3>⏱️ Timeline reciente</h3>
        <div class="timeline">
          <div class="timeline-item" *ngFor="let t of filteredTimeline()">
            <div class="dot"></div>
            <div>
              <strong>{{ t.title }}</strong>
              <span>{{ t.workspace }} · {{ date(t.timestamp) }}</span>
              <p>{{ t.detail }}</p>
            </div>
          </div>
        </div>
      </article>

      <aside class="card ops-context">
        <h3>📌 Contexto</h3>
        <ng-container *ngIf="selectedKpi() as k; else noKpi">
          <div class="focus-box">
            <span>{{ k.group }}</span>
            <strong>{{ formatValue(k.value) }}</strong>
            <p>{{ k.label }}</p>
            <small>{{ k.hint }}</small>
          </div>
        </ng-container>
        <ng-template #noKpi>
          <p class="muted">Selecciona un KPI para ver acciones sugeridas.</p>
        </ng-template>
        <ng-container *ngIf="selectedAlert() as a">
          <hr />
          <h4>{{ a.title }}</h4>
          <p>{{ a.description }}</p>
          <span class="chip">{{ a.workspace }}</span>
        </ng-container>
        <h4>✅ Checklist operativo</h4>
        <ul>
          <li>Revisar salidas pendientes antes de cierre.</li>
          <li>Validar bajo stock y lotes bloqueados.</li>
          <li>Cerrar caja diaria y revisar arqueo.</li>
          <li>Revisar eventos de configuración y permisos.</li>
        </ul>
      </aside>
    </section>

    <section class="card" *ngIf="active()==='alerts'">
      <h3>⚠️ Alertas accionables</h3>
      <div class="alerts-grid full">
        <button class="alert-tile" *ngFor="let a of filteredAlerts()" [class.warn]="a.severity==='warning'" [class.ok]="a.severity==='success'">
          <strong>{{ a.title }}</strong>
          <span>{{ a.workspace }}</span>
          <p>{{ a.description }}</p>
          <small>{{ a.action || 'Sin acción requerida' }}</small>
        </button>
      </div>
    </section>

    <section class="card" *ngIf="active()==='audit'">
      <div class="section-head">
        <div><h3>📜 Auditoría central</h3><p>Últimos 100 eventos registrados por el ERP.</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Acción</th><th>Entidad</th><th>Detalle</th><th>IP</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of filteredAudit()">
              <td>{{ date(a.created_at) }}</td>
              <td><strong>{{ a.action }}</strong></td>
              <td>{{ a.entity_type }} #{{ a.entity_id }}</td>
              <td>{{ a.detail || '—' }}</td>
              <td>{{ a.ip_address || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card" *ngIf="active()==='logs'">
      <h3>🧾 Logs técnicos base</h3>
      <p class="muted">Base visual para errores técnicos, workers e integraciones futuras. Por ahora se alimenta de auditoría y KPIs operativos.</p>
      <div class="log-list">
        <div class="log-row" *ngFor="let t of filteredTimeline()">
          <strong>{{ t.title }}</strong>
          <span>{{ t.workspace }} · {{ date(t.timestamp) }}</span>
          <p>{{ t.detail }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .ops-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:24px;border:1px solid var(--border);border-radius:26px;background:linear-gradient(135deg,rgba(245,158,11,.14),rgba(15,98,254,.08));margin-bottom:16px}.ops-hero h1{margin:6px 0}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.compact-primary{width:auto!important;margin-top:0!important}.ops-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:12px;margin-bottom:16px}.ops-toolbar input{margin-left:auto;min-width:300px}.ops-kpis{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.kpi.warn{border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.10)}.kpi.ok{border-color:rgba(22,163,74,.32);background:rgba(22,163,74,.09)}.ops-layout{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(330px,.8fr);gap:16px}.section-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}.alerts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:18px}.alerts-grid.full{margin-top:12px}.alert-tile{text-align:left;border:1px solid var(--border);border-radius:18px;background:var(--surface);color:var(--text);padding:14px;cursor:pointer;box-shadow:0 10px 26px rgba(15,23,42,.06)}.alert-tile.warn{background:rgba(245,158,11,.10);border-color:rgba(245,158,11,.35)}.alert-tile.ok{background:rgba(22,163,74,.09);border-color:rgba(22,163,74,.32)}.alert-tile strong{display:block}.alert-tile span{display:inline-flex;margin:8px 0;color:var(--muted);font-weight:800}.alert-tile p{margin:0 0 8px}.alert-tile small{color:var(--primary);font-weight:900}.timeline{display:grid;gap:12px}.timeline-item{display:grid;grid-template-columns:18px 1fr;gap:10px}.timeline-item .dot{width:12px;height:12px;border-radius:50%;background:var(--primary);box-shadow:0 0 0 5px rgba(15,98,254,.12);margin-top:5px}.timeline-item span{display:block;color:var(--muted);font-size:.84rem;margin-top:2px}.timeline-item p{margin:4px 0 0}.ops-context{position:sticky;top:16px;align-self:start}.focus-box{border:1px solid var(--border);border-radius:18px;background:rgba(15,98,254,.08);padding:16px;margin:12px 0}.focus-box span{display:block;color:var(--muted)}.focus-box strong{font-size:2rem}.log-list{display:grid;gap:10px}.log-row{border:1px solid var(--border);border-radius:16px;padding:12px;background:rgba(15,23,42,.03)}.log-row span{display:block;color:var(--muted);font-size:.86rem}.chip{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:7px 10px;color:var(--muted)}hr{border:0;border-top:1px solid var(--border);margin:16px 0}@media(max-width:1100px){.ops-layout{grid-template-columns:1fr}.ops-context{position:static}.ops-hero{flex-direction:column}.ops-toolbar input{margin-left:0;width:100%;min-width:0}}
  `]
})
export class OperationsComponent {
  private http = inject(HttpClient);
  busy = signal(false);
  active = signal('dashboard');
  data = signal<OperationsDashboard>({version:'15.6.0', generated_at:'', kpis:[], alerts:[], timeline:[]});
  audit = signal<AuditEntry[]>([]);
  selectedKpi = signal<OperationKPI|null>(null);
  selectedAlert = signal<OperationAlert|null>(null);
  search = '';

  constructor(){ this.load(); }

  load(){
    this.busy.set(true);
    this.http.get<OperationsDashboard>(`${API}/operations/dashboard`).subscribe({next:v=>{this.data.set(v); this.busy.set(false);}, error:()=>this.busy.set(false)});
    this.http.get<AuditEntry[]>(`${API}/operations/audit`).subscribe({next:v=>this.audit.set(v), error:()=>this.audit.set([])});
  }
  q(){ return this.search.toLowerCase().trim(); }
  formatValue(v:any){ return typeof v === 'number' ? Number(v).toFixed(2).replace('.00','') : v; }
  date(v:string){ return v ? new Date(v).toLocaleString() : '—'; }
  generatedAt(){ return this.date(this.data().generated_at); }
  selectKpi(k:OperationKPI){ this.selectedKpi.set(k); }
  filteredKpis(){ const q=this.q(); return this.data().kpis.filter(k => !q || [k.key,k.label,k.group,k.hint].join(' ').toLowerCase().includes(q)); }
  filteredAlerts(){ const q=this.q(); return this.data().alerts.filter(a => !q || [a.title,a.description,a.workspace,a.action].join(' ').toLowerCase().includes(q)); }
  filteredTimeline(){ const q=this.q(); return this.data().timeline.filter(t => !q || [t.title,t.detail,t.workspace].join(' ').toLowerCase().includes(q)); }
  filteredAudit(){ const q=this.q(); return this.audit().filter(a => !q || [a.action,a.entity_type,a.entity_id,a.detail,a.ip_address].join(' ').toLowerCase().includes(q)); }
  exportAuditCsv(){
    const rows = this.filteredAudit();
    const csv = ['Fecha,Acción,Entidad,ID,Detalle,IP', ...rows.map(r => [r.created_at,r.action,r.entity_type,r.entity_id,r.detail,r.ip_address].map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download='auditoria_erp_v15_6_0.csv'; a.click(); URL.revokeObjectURL(url);
  }
  print(){ window.print(); }
}
