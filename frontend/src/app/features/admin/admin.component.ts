import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

const API = 'http://localhost:8000/api/v1/admin/permissions';

type Role = { id?: number; code: string; name: string; permissions: string[] };
type Permission = { id?: number; code: string; description: string; module: string; action: string };
type AdminOverview = { roles: Role[]; permissions: Permission[] };

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast" *ngIf="toast()">{{ toast() }}</div>
    <div class="page-header inventory-hero">
      <div>
        <span class="eyebrow">🔐 v15.2.0 Core + Workspaces</span>
        <h1>Roles y permisos</h1>
        <p>Base granular para proteger acciones sensibles del ERP: configuración, inventario, compras, ventas y POS.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" (click)="load()">🔄 Actualizar</button>
        <button class="btn primary wide-auto" type="button" (click)="seed()">🛡️ Cargar permisos base</button>
      </div>
    </div>

    <section class="metric-grid pro-metrics">
      <article class="metric"><span>Roles</span><strong>{{ roles().length }}</strong></article>
      <article class="metric"><span>Permisos</span><strong>{{ permissions().length }}</strong></article>
      <article class="metric"><span>Administrador</span><strong>{{ permissionCount('admin') }}</strong></article>
      <article class="metric"><span>Ventas</span><strong>{{ permissionCount('ventas') }}</strong></article>
      <article class="metric"><span>Inventario</span><strong>{{ permissionCount('inventario') }}</strong></article>
      <article class="metric"><span>Compras</span><strong>{{ permissionCount('compras') }}</strong></article>
    </section>

    <section class="settings-layout">
      <aside class="card settings-nav">
        <h3>Roles base</h3>
        <button type="button" class="settings-nav-item" *ngFor="let role of roles()" [class.active]="activeRole()?.code === role.code" (click)="activeRole.set(role)">
          {{ role.name }}
          <span>{{ role.permissions.length }}</span>
        </button>
        <div class="mini-help">
          <strong>Modo actual:</strong><br />
          Los permisos ya quedan sembrados y visibles. La edición granular completa vendrá cuando activemos usuarios reales.
        </div>
      </aside>

      <article class="card settings-panel" *ngIf="activeRole() as role">
        <div class="table-header">
          <div>
            <h3>{{ role.name }}</h3>
            <p class="muted">Permisos asignados al rol <code>{{ role.code }}</code>.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="setting-field" *ngFor="let code of role.permissions">
            <span>{{ code }}</span>
            <small>{{ permissionDescription(code) }}</small>
            <code>{{ permissionModule(code) }}</code>
          </div>
        </div>
      </article>
    </section>
  `
})
export class AdminComponent {
  private http = inject(HttpClient);
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>([]);
  activeRole = signal<Role | null>(null);
  toast = signal('');

  constructor() { this.load(); }

  load() {
    this.http.get<AdminOverview>(API).subscribe({
      next: data => {
        this.roles.set(data.roles || []);
        this.permissions.set(data.permissions || []);
        this.activeRole.set((data.roles || [])[0] || null);
      },
      error: err => this.showToast('No se pudieron cargar permisos: ' + this.extractError(err))
    });
  }

  seed() {
    this.http.post<AdminOverview>(`${API}/seed`, {}).subscribe({
      next: data => {
        this.roles.set(data.roles || []);
        this.permissions.set(data.permissions || []);
        this.activeRole.set((data.roles || [])[0] || null);
        this.showToast('Permisos base cargados correctamente.');
      },
      error: err => this.showToast('No se pudieron cargar permisos: ' + this.extractError(err))
    });
  }

  permissionCount(roleCode: string): number {
    return this.roles().find(r => r.code === roleCode)?.permissions.length || 0;
  }

  permissionDescription(code: string): string {
    return this.permissions().find(p => p.code === code)?.description || 'Permiso del sistema';
  }

  permissionModule(code: string): string { return code.split('.')[0] || 'sistema'; }

  showToast(message: string) { this.toast.set(message); setTimeout(() => this.toast.set(''), 3500); }
  extractError(err: any): string {
    if (typeof err?.error?.detail === 'string') return err.error.detail;
    if (Array.isArray(err?.error?.detail)) return err.error.detail.map((x: any) => x.msg || JSON.stringify(x)).join(', ');
    if (err?.message) return err.message;
    return 'Error desconocido';
  }
}
