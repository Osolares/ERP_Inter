import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1';

type ReportKPI = { key:string; label:string; value:any; suffix:string; hint:string; group:string };
type ReportRow = { label:string; value:any; extra:string; amount:number };
type WorkspaceReport = { workspace:string; title:string; description:string; kpis:ReportKPI[]; rows:ReportRow[] };
type ReportsDashboard = { version:string; generated_at:string; kpis:ReportKPI[]; workspaces:WorkspaceReport[] };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="reports-hero">
      <div>
        <span class="eyebrow">📊 ERP v15.6.0 · Reportes Inteligentes</span>
        <h1>Centro de Reportes</h1>
        <p>Inventario, Comercial, Compras y Financiero en una sola vista con filtros, exportación y vista imprimible.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" (click)="load()" [disabled]="busy()">🔄 Actualizar</button>
        <button class="btn" (click)="exportCsv()">📤 CSV</button>
        <button class="btn primary" (click)="printReport()">🖨️ Imprimir</button>
      </div>
    </section>

    <section class="report-toolbar">
      <button class="tool" [class.active]="active()==='general'" (click)="active.set('general')">⭐ General</button>
      <button class="tool" *ngFor="let w of data().workspaces" [class.active]="active()===w.workspace" (click)="active.set(w.workspace)">{{ icon(w.workspace) }} {{ w.title }}</button>
      <input [(ngModel)]="search" placeholder="Buscar KPI, reporte o fila..." />
    </section>

    <section class="kpi-grid reports-kpis">
      <button class="kpi" *ngFor="let k of filteredKpis()" (click)="selectKpi(k)">
        <span>{{ k.group }}</span>
        <strong>{{ formatValue(k) }}</strong>
        <small>{{ k.label }}</small>
      </button>
    </section>

    <section class="reports-layout">
      <article class="card reports-main">
        <div class="section-head">
          <div>
            <h3>{{ currentTitle() }}</h3>
            <p>{{ currentDescription() }}</p>
          </div>
          <span class="chip">Generado {{ generatedAt() }}</span>
        </div>

        <div class="smart-bars" *ngIf="active()==='general'">
          <div class="bar-line" *ngFor="let item of topGroups()">
            <div><strong>{{ item.group }}</strong><small>{{ item.total }} registros / Q {{ money(item.amount) }}</small></div>
            <div class="bar"><span [style.width.%]="item.percent"></span></div>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr><th>Reporte</th><th>Valor</th><th>Detalle</th><th>Monto</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of filteredRows()">
                <td><strong>{{ r.label }}</strong></td>
                <td>{{ r.value }}</td>
                <td>{{ r.extra || '—' }}</td>
                <td>{{ r.amount ? ('Q ' + money(r.amount)) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="card report-context">
        <h3>🧠 Panel contextual</h3>
        <p class="muted" *ngIf="!selectedKpi()">Selecciona un KPI para ver su contexto y acciones sugeridas.</p>
        <ng-container *ngIf="selectedKpi() as k">
          <div class="report-focus">
            <span>{{ k.group }}</span>
            <strong>{{ formatValue(k) }}</strong>
            <p>{{ k.label }}</p>
          </div>
          <div class="action-list">
            <button class="btn" (click)="active.set(workspaceFromGroup(k.group))">🔍 Ver reporte relacionado</button>
            <button class="btn" (click)="exportCsv()">📤 Exportar datos</button>
            <button class="btn" (click)="printReport()">🖨️ Imprimir vista</button>
          </div>
        </ng-container>

        <h4>⭐ Reportes favoritos base</h4>
        <ul>
          <li>Inventario físico vs contable</li>
          <li>Ventas y cobros</li>
          <li>Compras y costos</li>
          <li>Facturas pendientes</li>
        </ul>
      </aside>
    </section>
  `,
  styles: [`
    .reports-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:24px;border:1px solid var(--border);border-radius:26px;background:linear-gradient(135deg,rgba(15,98,254,.14),rgba(34,197,94,.08));margin-bottom:16px}.reports-hero h1{margin:6px 0}.hero-actions{display:flex;gap:10px;flex-wrap:wrap}.report-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:12px;margin-bottom:16px}.report-toolbar input{margin-left:auto;min-width:280px}.reports-kpis{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}.reports-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(320px,.8fr);gap:16px}.reports-main,.report-context{min-width:0}.section-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:14px}.smart-bars{display:grid;gap:12px;margin-bottom:16px}.bar-line{display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:center}.bar-line small{display:block;color:var(--muted)}.bar{height:14px;border-radius:999px;background:rgba(102,112,133,.14);overflow:hidden}.bar span{display:block;height:100%;border-radius:inherit;background:var(--primary)}.report-context{position:sticky;top:16px;align-self:start}.report-focus{border:1px solid var(--border);background:rgba(15,98,254,.08);border-radius:18px;padding:16px;margin:12px 0}.report-focus span{color:var(--muted);display:block}.report-focus strong{font-size:2rem}.action-list{display:grid;gap:10px;margin:12px 0}.chip{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:7px 10px;color:var(--muted)}@media(max-width:1100px){.reports-layout{grid-template-columns:1fr}.report-context{position:static}.reports-hero{flex-direction:column}.report-toolbar input{width:100%;margin-left:0}.bar-line{grid-template-columns:1fr}}
  `]
})
export class ReportsComponent {
  private http = inject(HttpClient);
  busy = signal(false);
  active = signal('general');
  selectedKpi = signal<ReportKPI|null>(null);
  search = '';
  data = signal<ReportsDashboard>({version:'15.6.0', generated_at:'', kpis:[], workspaces:[]});

  constructor(){ this.load(); }

  load(){
    this.busy.set(true);
    this.http.get<ReportsDashboard>(`${API}/reports/dashboard`).subscribe({
      next: v => { this.data.set(v); this.busy.set(false); },
      error: () => { this.busy.set(false); }
    });
  }

  money(v:any){ return Number(v||0).toFixed(2); }
  icon(w:string){ return ({inventory:'📦', commercial:'💼', purchases:'📥', financial:'💵'} as any)[w] || '📊'; }
  generatedAt(){ const d=this.data().generated_at; return d ? new Date(d).toLocaleString() : '—'; }
  formatValue(k:ReportKPI){ return `${k.suffix==='GTQ' ? 'Q ' : ''}${typeof k.value==='number' ? this.money(k.value).replace('.00','') : k.value}${k.suffix && k.suffix!=='GTQ' ? ' '+k.suffix : ''}`; }
  selectKpi(k:ReportKPI){ this.selectedKpi.set(k); }
  workspaceFromGroup(group:string){ return ({Inventario:'inventory', Comercial:'commercial', Compras:'purchases', Financiero:'financial'} as any)[group] || 'general'; }

  currentWorkspace(){ return this.data().workspaces.find(w => w.workspace === this.active()); }
  currentTitle(){ return this.active()==='general' ? 'Resumen ejecutivo general' : (this.currentWorkspace()?.title || 'Reporte'); }
  currentDescription(){ return this.active()==='general' ? 'Vista consolidada por Workspace con indicadores principales.' : (this.currentWorkspace()?.description || ''); }

  filteredKpis(){
    const q=this.search.toLowerCase().trim();
    const list = this.active()==='general' ? this.data().kpis : (this.currentWorkspace()?.kpis || []);
    return list.filter(k => !q || [k.label,k.group,k.key].join(' ').toLowerCase().includes(q));
  }
  filteredRows(){
    const q=this.search.toLowerCase().trim();
    const rows = this.active()==='general'
      ? this.data().workspaces.flatMap(w => w.rows.map(r => ({...r, label:`${w.title}: ${r.label}`})))
      : (this.currentWorkspace()?.rows || []);
    return rows.filter(r => !q || [r.label,r.value,r.extra].join(' ').toLowerCase().includes(q));
  }
  topGroups(){
    const groups = this.data().workspaces.map(w => ({
      group: w.title,
      total: w.rows.reduce((a,r)=> a + (typeof r.value === 'number' ? Number(r.value) : 0), 0),
      amount: w.rows.reduce((a,r)=> a + Number(r.amount || 0), 0)
    }));
    const max = Math.max(...groups.map(g=>g.amount), 1);
    return groups.map(g => ({...g, percent: Math.max(8, (g.amount/max)*100)}));
  }
  exportCsv(){
    const rows = this.filteredRows();
    const csv = ['Reporte,Valor,Detalle,Monto', ...rows.map(r => [r.label,r.value,r.extra,r.amount].map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `reportes_erp_v15_6_0.csv`; a.click(); URL.revokeObjectURL(url);
  }
  printReport(){ window.print(); }
}
