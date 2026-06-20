import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Kpi = { key: string; label: string; value: number | string; helper: string; severity: string; target_filter: string };
type Action = { key: string; label: string; icon: string; workspace: string; target?: string; description: string; enabled: boolean };
type SearchResult = { entity_type: string; id: number; title: string; subtitle: string; status: string; summary: any; actions: Action[] };
type Overview = { version: string; message: string; kpis: Kpi[]; alerts: any[]; actions: Action[]; inventory_context: any; commercial_context: any; purchases_context: any; automotive_context: any };

@Component({
  selector: 'app-smart-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page-header inventory-hero smart-hero">
      <div>
        <span class="eyebrow">🧠 Workspaces Inteligentes</span>
        <h1>Centro de Contexto ERP</h1>
        <p>Panel unificado para buscar, analizar y ejecutar acciones sin saltar entre pantallas.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" (click)="refresh()">🔄 Actualizar</button>
        <a class="btn" routerLink="/operations">🧭 Auditoría</a>
        <a class="btn" routerLink="/reports">📊 Reportes</a>
      </div>
    </section>

    <section class="smart-toolbar smart-searchbar">
      <input [(ngModel)]="query" (keyup.enter)="doSearch()" placeholder="Buscar SKU, lote, OEM, número motor, factura, cliente..." />
      <button class="tool active" type="button" (click)="doSearch()">🔎 Buscar</button>
      <button class="tool" type="button" (click)="query=''; results.set([]); selected.set(null)">Limpiar</button>
    </section>

    <section class="metric-grid pro-metrics" *ngIf="overview() as ov">
      <article class="metric smart-kpi" *ngFor="let k of ov.kpis" [class.warn]="k.severity === 'warning'" [class.danger]="k.severity === 'danger'" (click)="applyKpi(k)">
        <span>{{ k.label }}</span>
        <strong>{{ k.value }}</strong>
        <small>{{ k.helper }}</small>
      </article>
    </section>

    <section class="grid-three" *ngIf="overview() as ov">
      <article class="card pro-card">
        <h3>⚡ Acciones rápidas</h3>
        <p class="muted">Acciones transversales para operar sin buscar el módulo exacto.</p>
        <div class="action-list">
          <a class="smart-action" *ngFor="let a of ov.actions" [routerLink]="a.target || '/'">
            <span>{{ a.icon }}</span>
            <strong>{{ a.label }}</strong>
            <small>{{ a.description }}</small>
          </a>
        </div>
      </article>

      <article class="card pro-card">
        <h3>🚨 Alertas accionables</h3>
        <div class="alert-row" *ngFor="let a of ov.alerts">
          <strong>{{ a.title }}</strong>
          <span>{{ a.count }}</span>
          <small>{{ a.action }}</small>
        </div>
        <div class="mini-help" *ngIf="!ov.alerts.length">No hay alertas críticas en este momento.</div>
      </article>

      <article class="card pro-card">
        <h3>📌 Contexto de Workspaces</h3>
        <div class="context-grid">
          <button [class.active]="mode() === 'inventory'" (click)="mode.set('inventory')">📦 Inventario</button>
          <button [class.active]="mode() === 'commercial'" (click)="mode.set('commercial')">💼 Comercial</button>
          <button [class.active]="mode() === 'purchases'" (click)="mode.set('purchases')">📥 Compras</button>
          <button [class.active]="mode() === 'automotive'" (click)="mode.set('automotive')">🚗 Automotriz</button>
        </div>
        <div class="context-card">
          <pre>{{ currentContext() | json }}</pre>
        </div>
      </article>
    </section>

    <section class="smart-workspace-grid">
      <article class="card smart-results">
        <div class="table-header">
          <div><h3>🔎 Resultados contextuales</h3><p class="muted">Selecciona un registro para ver sus acciones y resumen.</p></div>
          <span class="chip">{{ results().length }} resultados</span>
        </div>
        <div class="smart-result" *ngFor="let r of results()" [class.active]="selected()?.entity_type === r.entity_type && selected()?.id === r.id" (click)="selected.set(r)">
          <div>
            <span class="chip soft">{{ labelType(r.entity_type) }}</span>
            <strong>{{ r.title }}</strong>
            <small>{{ r.subtitle }}</small>
          </div>
          <span class="status-pill">{{ r.status }}</span>
        </div>
        <div class="mini-help" *ngIf="!results().length">Escribe una búsqueda o selecciona un KPI para filtrar.</div>
      </article>

      <aside class="card smart-context-panel" *ngIf="selected() as item; else emptyContext">
        <span class="eyebrow">{{ labelType(item.entity_type) }}</span>
        <h2>{{ item.title }}</h2>
        <p class="muted">{{ item.subtitle }}</p>
        <div class="info-list smart-info">
          <ng-container *ngFor="let pair of summaryPairs(item.summary)">
            <span>{{ pair[0] }}</span><strong>{{ pair[1] }}</strong>
          </ng-container>
        </div>
        <h3 class="section-title">Acciones disponibles</h3>
        <div class="action-list">
          <button class="smart-action button-action" *ngFor="let a of item.actions" [disabled]="a.enabled === false" (click)="selectAction(a)">
            <span>{{ a.icon }}</span>
            <strong>{{ a.label }}</strong>
            <small>{{ a.description }}</small>
          </button>
        </div>
        <div class="mini-help" *ngIf="lastAction()">Última acción seleccionada: {{ lastAction() }}</div>
      </aside>
      <ng-template #emptyContext>
        <aside class="card smart-context-panel">
          <span class="eyebrow">📋 Panel contextual</span>
          <h2>Selecciona un resultado</h2>
          <p class="muted">Aquí verás resumen, acciones rápidas, trazabilidad y enlaces naturales al Workspace correcto.</p>
          <div class="rules-grid">
            <div><strong>Menos navegación</strong><p>El usuario no debe preguntarse en qué módulo hacer una acción.</p></div>
            <div><strong>Acciones por contexto</strong><p>Producto, lote, factura o compra muestran acciones distintas.</p></div>
            <div><strong>Base para Woo/FEL</strong><p>Las integraciones futuras consultarán contexto sin tocar el núcleo.</p></div>
          </div>
        </aside>
      </ng-template>
    </section>
  `
})
export class SmartWorkspaceComponent implements OnInit {
  private api = 'http://127.0.0.1:8000/api/v1/workspaces/smart';
  overview = signal<Overview | null>(null);
  results = signal<SearchResult[]>([]);
  selected = signal<SearchResult | null>(null);
  mode = signal<'inventory'|'commercial'|'purchases'|'automotive'>('inventory');
  lastAction = signal('');
  query = '';

  currentContext = computed(() => {
    const ov = this.overview();
    if (!ov) return {};
    const key = `${this.mode()}_context` as keyof Overview;
    return (ov as any)[key] || {};
  });

  constructor(private http: HttpClient) {}
  ngOnInit() { this.refresh(); }
  refresh() { this.http.get<Overview>(`${this.api}/overview`).subscribe(r => this.overview.set(r)); }
  doSearch() { this.http.get<{query: string; total: number; results: SearchResult[]}>(`${this.api}/search?q=${encodeURIComponent(this.query || '')}`).subscribe(r => { this.results.set(r.results); this.selected.set(r.results[0] || null); }); }
  applyKpi(k: Kpi) { this.query = k.target_filter || k.label; this.doSearch(); }
  selectAction(a: Action) { this.lastAction.set(`${a.icon} ${a.label} → ${a.workspace}`); }
  labelType(t: string) { return ({product: 'Producto', lot: 'Lote', invoice: 'Factura', purchase: 'Compra', customer: 'Cliente'} as any)[t] || t; }
  summaryPairs(obj: any) { return Object.entries(obj || {}).map(([k, v]) => [this.pretty(k), String(v ?? '')]); }
  pretty(k: string) { return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
}
