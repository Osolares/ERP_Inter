import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Base técnica e inventario inicial activos para ERP Intermotores v14.</p>
    </div>
    <div class="cards">
      <article class="card"><h3>Core Técnico</h3><p>Empresas, usuarios, permisos, configuración y auditoría.</p></article>
      <article class="card"><h3>Core de Negocio</h3><p>Inventario base: productos, lotes, bodegas y Kardex inicial.</p></article>
      <article class="card"><h3>Integraciones</h3><p>WooCommerce, FEL y chatbot serán desacoplados.</p></article>
    </div>
  `
})
export class DashboardComponent {}
