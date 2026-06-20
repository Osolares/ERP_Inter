import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type MenuLink = { label: string; path: string; icon: string };
type MenuGroup = { key: string; title: string; icon: string; links: MenuLink[] };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <aside class="sidebar pro-sidebar">
      <div class="brand">Intermotores</div>
      <div class="version">ERP v16.10.1</div>

      <nav class="menu-tree">
        <a class="home-link" routerLink="/">
          <span class="menu-icon">🏠</span>
          <span>Dashboard</span>
        </a>

        <section class="menu-group" *ngFor="let g of groups">
          <button class="menu-title" type="button" (click)="toggle(g.key)">
            <span class="menu-label">
              <span class="menu-icon">{{ g.icon }}</span>
              <span>{{ g.title }}</span>
            </span>
            <strong class="chevron">{{ open()[g.key] ? '▾' : '▸' }}</strong>
          </button>

          <div class="submenu" *ngIf="open()[g.key]">
            <a *ngFor="let l of g.links" [routerLink]="l.path">
              <span class="menu-icon">{{ l.icon }}</span>
              <span>{{ l.label }}</span>
            </a>
          </div>
        </section>
      </nav>
    </aside>
  `
})
export class SidebarComponent {
  groups: MenuGroup[] = [
    {
      key: 'inventory',
      title: 'Inventario',
      icon: '📦',
      links: [
        { label: 'Dashboard', path: '/inventory', icon: '📊' },
        { label: 'Productos', path: '/inventory/products', icon: '📦' },
        { label: 'Lotes', path: '/inventory/lots', icon: '🏷️' },
        { label: 'Categorías', path: '/inventory/categories', icon: '🗂️' },
        { label: 'Marcas / Modelos', path: '/inventory/brands-models', icon: '🚗' },
        { label: 'Catálogos / Atributos', path: '/inventory/attributes', icon: '🧩' },
        { label: 'Series motor', path: '/inventory/engine-series', icon: '⚙️' },
        { label: 'Kardex', path: '/inventory', icon: '📒' },
        { label: 'Desarmes', path: '/automotive', icon: '🛠️' },
        { label: 'Multimedia / Etiquetas', path: '/multimedia', icon: '🖼️' }
      ]
    },
    {
      key: 'commercial',
      title: 'Comercial',
      icon: '💼',
      links: [
        { label: 'Dashboard', path: '/commercial', icon: '📊' },
        { label: 'POS', path: '/commercial', icon: '🧾' },
        { label: 'Facturación', path: '/commercial/facturacion', icon: '📄' },
        { label: 'Salidas', path: '/commercial/salidas', icon: '📤' },
        { label: 'Cotizaciones', path: '/commercial/cotizaciones', icon: '📝' },
        { label: 'Plantillas', path: '/commercial/plantillas', icon: '📋' }
      ]
    },
    {
      key: 'purchases',
      title: 'Compras',
      icon: '🛒',
      links: [
        { label: 'Dashboard compras', path: '/purchases', icon: '📊' },
        { label: 'Proveedores', path: '/purchases/suppliers', icon: '🤝' },
        { label: 'Importaciones', path: '/purchases', icon: '🚢' }
      ]
    },
    {
      key: 'financial',
      title: 'Financiero',
      icon: '💰',
      links: [
        { label: 'Caja / Cobros', path: '/financial', icon: '💵' },
        { label: 'Reportes Pro', path: '/reports', icon: '📈' },
        { label: 'Documentos Pro', path: '/documents', icon: '🗃️' }
      ]
    },
    {
      key: 'admin',
      title: 'Administración',
      icon: '⚙️',
      links: [
        { label: 'Configuración', path: '/settings', icon: '⚙️' },
        { label: 'Roles y permisos', path: '/admin', icon: '🔐' },
        { label: 'Operaciones / Auditoría', path: '/operations', icon: '🕵️' }
      ]
    },
    {
      key: 'platform',
      title: 'Automotriz / Plataforma',
      icon: '🚘',
      links: [
        { label: 'Automotriz Pro', path: '/automotive', icon: '🚘' },
        { label: 'Workspaces Inteligentes', path: '/smart-workspaces', icon: '🧠' }
      ]
    }
  ];

  open = signal<Record<string, boolean>>({
    inventory: false,
    commercial: false,
    purchases: false,
    financial: false,
    admin: false,
    platform: false
  });

  toggle(key: string) {
    this.open.set({ ...this.open(), [key]: !this.open()[key] });
  }
}
