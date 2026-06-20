import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1/settings';

type Setting = {
  id?: number | null;
  key: string;
  value: string;
  value_type: string;
  group: string;
  label: string;
  description: string;
  is_public: boolean;
};

type GroupedSettings = Record<string, Setting[]>;

const GROUP_LABELS: Record<string, string> = {
  company: '🏢 Empresa',
  inventory: '📦 Inventario',
  products: '🧩 Productos',
  sales: '🧾 Ventas y salidas',
  purchases: '📥 Compras',
  documents: '🖨️ Documentos',
  integrations: '🔌 Integraciones',
  system: '🛡️ Sistema',
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toast" *ngIf="toast()">{{ toast() }}</div>

    <div class="page-header inventory-hero">
      <div>
        <span class="eyebrow">⚙️ v15.2.0 Core + Workspaces</span>
        <h1>Configuración centralizada</h1>
        <p>Modelo híbrido: una sola fuente de verdad, con acceso contextual desde cada módulo.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" (click)="load()">🔄 Actualizar</button>
        <button class="btn" type="button" (click)="seedDefaults()">↩️ Restablecer configuración</button>
        <button class="btn primary wide-auto" type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Guardando...' : '💾 Guardar configuración' }}</button>
      </div>
    </div>

    <section class="alert-card">
      <strong>Regla:</strong> la configuración vive centralizada, pero cada módulo puede abrir su sección correspondiente sin duplicar valores.
      GTQ, IVA 12%, zona horaria Guatemala y costos con IVA incluido quedan como valores por defecto editables por empresa.
    </section>

    <section class="metric-grid pro-metrics">
      <article class="metric"><span>🏢 Moneda</span><strong>{{ getValue('company.currency') || 'GTQ' }}</strong></article>
      <article class="metric"><span>🧾 IVA</span><strong>{{ getValue('company.tax_rate') || '12' }}%</strong></article>
      <article class="metric"><span>🌎 Zona horaria</span><strong class="small-strong">{{ getValue('company.timezone') || 'America/Guatemala' }}</strong></article>
      <article class="metric"><span>💲 Descuento oferta</span><strong>{{ getValue('products.default_offer_discount') || '10' }}%</strong></article>
      <article class="metric"><span>📦 Disponible venta</span><strong class="small-strong">{{ getValue('inventory.available_for_sale_mode') || 'fisico' }}</strong></article>
      <article class="metric"><span>🚚 Salida físico</span><strong>{{ getValue('sales.warehouse_exit_affects_physical') === 'true' ? 'Sí' : 'No' }}</strong></article>
    </section>

    <section class="settings-layout">
      <aside class="card settings-nav">
        <h3>Secciones</h3>
        <button type="button" class="settings-nav-item" *ngFor="let g of groups" [class.active]="activeGroup() === g" (click)="activeGroup.set(g)">
          {{ groupLabel(g) }}
          <span>{{ settings()[g]?.length || 0 }}</span>
        </button>
        <div class="mini-help">
          <strong>Acceso contextual</strong><br />
          Cada módulo puede abrir esta misma pantalla en su sección correspondiente sin duplicar valores.
        </div>
      </aside>

      <article class="card settings-panel">
        <div class="table-header">
          <div>
            <h3>{{ groupLabel(activeGroup()) }}</h3>
            <p class="muted">Edita solo lo necesario. Los cambios se guardan en app_settings. Multiempresa quedará desacoplado hasta activar el dominio Empresas.</p>
          </div>
          <button class="btn wide-auto" type="button" (click)="resetVisibleGroup()">↩️ Restaurar visibles</button>
        </div>

        <div class="settings-grid">
          <label class="setting-field" *ngFor="let item of visibleSettings()">
            <span>{{ item.label }}</span>
            <small>{{ item.description }}</small>
            <ng-container [ngSwitch]="item.value_type">
              <select *ngSwitchCase="'boolean'" [(ngModel)]="item.value">
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
              <select *ngSwitchCase="'select'" [(ngModel)]="item.value">
                <option value="fisico">Físico</option>
                <option value="contable">Contable</option>
                <option value="ambos">Ambos</option>
              </select>
              <input *ngSwitchCase="'decimal'" type="number" [(ngModel)]="item.value" />
              <input *ngSwitchDefault [(ngModel)]="item.value" />
            </ng-container>
            <code>{{ item.key }}</code>
          </label>
        </div>
      </article>
    </section>
  `
})
export class SettingsComponent {
  private http = inject(HttpClient);
  settings = signal<GroupedSettings>({});
  activeGroup = signal('company');
  saving = signal(false);
  toast = signal('');
  groups = ['company','inventory','products','sales','purchases','documents','integrations','system'];

  visibleSettings = computed(() => this.settings()[this.activeGroup()] || []);

  constructor() { this.load(); }

  groupLabel(g: string) { return GROUP_LABELS[g] || g; }

  load() {
    this.http.get<GroupedSettings>(API).subscribe({
      next: data => this.settings.set(data),
      error: err => this.showToast('No se pudo cargar configuración: ' + this.extractError(err))
    });
  }

  seedDefaults() {
    this.http.post<GroupedSettings>(`${API}/seed`, {}).subscribe({
      next: data => { this.settings.set(data); this.showToast('Configuración restablecida correctamente.'); },
      error: err => this.showToast('No se pudo restablecer configuración: ' + this.extractError(err))
    });
  }

  save() {
    const payload = { settings: Object.values(this.settings()).flat().map(item => ({
      key: item.key,
      value: item.value,
      value_type: item.value_type,
      group: item.group,
      is_public: item.is_public,
    }))};
    this.saving.set(true);
    this.http.put<GroupedSettings>(API, payload).subscribe({
      next: data => { this.settings.set(data); this.saving.set(false); this.showToast('Configuración guardada correctamente.'); },
      error: err => { this.saving.set(false); this.showToast('No se pudo guardar: ' + this.extractError(err)); }
    });
  }

  resetVisibleGroup() {
    this.seedDefaults();
  }

  getValue(key: string): string {
    const all = Object.values(this.settings()).flat();
    return all.find(x => x.key === key)?.value || '';
  }

  showToast(message: string) {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 3500);
  }

  extractError(err: any): string {
    if (typeof err?.error?.detail === 'string') return err.error.detail;
    if (Array.isArray(err?.error?.detail)) return err.error.detail.map((x: any) => x.msg || JSON.stringify(x)).join(', ');
    if (err?.message) return err.message;
    return 'Error desconocido';
  }
}
