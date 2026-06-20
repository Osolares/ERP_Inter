import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface AutomotiveMetric { label: string; value: string | number; hint: string; status: string; }
interface FieldSpec { field: string; label: string; source: string; input_type: string; required: boolean; autocomplete: string; notes: string; }
interface BusinessRule { code: string; title: string; area: string; description: string; applies_to: string[]; status: string; }
interface AutomationRule { code: string; title: string; trigger: string; actions: string[]; configurable: boolean; status: string; }
interface CompatibilityTemplate { brand: string; model: string; generation: string; year_from: string; year_to: string; engine_series: string; fuel_type: string; displacement_cc: string; observations: string; }
interface AutomotiveOverview {
  metrics: AutomotiveMetric[];
  product_fields: FieldSpec[];
  lot_fields: FieldSpec[];
  document_rules: BusinessRule[];
  disassembly_rules: BusinessRule[];
  automation_rules: AutomationRule[];
  compatibility_templates: CompatibilityTemplate[];
  v13_lessons: string[];
}
interface PreviewResponse {
  suggested_sku: string; suggested_name: string; fuel_type: string; displacement_cc: string; cylinders: string; brand_name: string;
  category_rules: string[]; price_sale: number; price_offer: number; description_template: string; warnings: string[];
}
interface SkuPreview { sku: string; lot_code_suggestion: string; explanation: string[]; }
interface CompatibilityPreview { engine_series_code: string; suggested: CompatibilityTemplate[]; warnings: string[]; }
interface DescriptionPreview { description: string; parts_used: string[]; }
interface AutomotiveSearchResult { entity: string; id: number | null; title: string; subtitle: string; code: string; status: string; action_hint: string; }
interface AutomotiveSearchResponse { query: string; total: number; results: AutomotiveSearchResult[]; suggestions: string[]; }
interface OemNormalizeResult { primary: string; compatible: string[]; normalized: string; warnings: string[]; }
interface ProductLotAssistantResult { product_summary: Record<string, string | number | boolean>; lot_summary: Record<string, string | number | boolean>; required_fields: string[]; warnings: string[]; next_actions: string[]; }
interface DisassemblySummary { total_disassemblies: number; active_disassemblies: number; reversed_disassemblies: number; disassemblable_lots: number; pending_cost_review: number; }
interface DisassemblyRead { id: number; disassembly_code: string; source_lot_id: number; mode: string; status: string; source_qty: number; source_unit_cost: number; total_cost: number; allocated_cost: number; residual_cost: number; notes: string; }

type AutomotiveSection = 'campos' | 'reglas' | 'desarmes' | 'desarme-operativo' | 'asistente' | 'compatibilidades' | 'sku' | 'documentos' | 'busqueda' | 'oem' | 'producto-lote' | 'v13';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header automotive-hero">
      <div>
        <span class="eyebrow">🚗 ERP Automotriz Intermotores</span>
        <h1>Producto/Lote Automotriz Integrado</h1>
        <p>Automatizaciones aplicadas a producto, lote, OEM, búsqueda global, descripciones y compatibilidades. v13 aporta conocimiento funcional; v16 lo integra sin copiar código.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" (click)="loadOverview()">🔄 Actualizar</button>
        <button class="btn" type="button" (click)="section.set('compatibilidades')">🚘 Compatibilidades</button>
        <button class="btn primary wide-auto" type="button" (click)="section.set('asistente')">🧠 Probar automatización</button>
      </div>
    </div>

    <section class="metric-grid pro-metrics">
      <article class="metric action-metric" *ngFor="let metric of overview()?.metrics">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.hint }}</small>
      </article>
    </section>

    <div class="tabs tabs-wrap">
      <button class="tab" [class.active]="section() === 'campos'" (click)="section.set('campos')">📋 Campos</button>
      <button class="tab" [class.active]="section() === 'reglas'" (click)="section.set('reglas')">⚙️ Reglas</button>
      <button class="tab" [class.active]="section() === 'compatibilidades'" (click)="section.set('compatibilidades')">🚘 Compatibilidades</button>
      <button class="tab" [class.active]="section() === 'sku'" (click)="section.set('sku')">🏷️ SKU</button>
      <button class="tab" [class.active]="section() === 'documentos'" (click)="section.set('documentos')">🧾 Descripción</button>
      <button class="tab" [class.active]="section() === 'busqueda'" (click)="section.set('busqueda')">🔎 Búsqueda global</button>
      <button class="tab" [class.active]="section() === 'oem'" (click)="section.set('oem')">🏭 OEM</button>
      <button class="tab" [class.active]="section() === 'producto-lote'" (click)="section.set('producto-lote')">📦 Producto + Lote</button>
      <button class="tab" [class.active]="section() === 'desarmes'" (click)="section.set('desarmes')">🔧 Reglas desarme</button>
      <button class="tab" [class.active]="section() === 'desarme-operativo'" (click)="section.set('desarme-operativo'); loadDisassemblies()">🧰 Desarme operativo</button>
      <button class="tab" [class.active]="section() === 'asistente'" (click)="section.set('asistente')">🧠 Asistente</button>
      <button class="tab" [class.active]="section() === 'v13'" (click)="section.set('v13')">📚 Lecciones v13</button>
    </div>

    <section *ngIf="loading()" class="card"><p>⏳ Cargando dominio automotriz...</p></section>
    <section *ngIf="error()" class="alert-card danger-alert"><strong>Error:</strong> {{ error() }}</section>

    <section *ngIf="section() === 'campos' && overview()" class="grid-two automotive-grid">
      <article class="card">
        <h3>📦 Producto maestro</h3>
        <p class="muted">Producto maestro sin stock directo. Los campos se ordenan por uso real: operación diaria, búsqueda, documentos, Woo futuro y reportes.</p>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Campo</th><th>Entrada</th><th>Regla</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of filteredProductFields()">
                <td><strong>{{ f.label }}</strong><br><small>{{ f.field }}</small></td>
                <td>{{ f.input_type }}<br><span class="chip" *ngIf="f.required">Obligatorio</span></td>
                <td><small>{{ f.autocomplete || f.notes || f.source }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h3>🏷️ Lotes inteligentes</h3>
        <p class="muted">El lote conserva físico, contable, costo con IVA incluido, trazabilidad, QR/barcode, número motor y reglas de desarme.</p>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Campo</th><th>Entrada</th><th>Regla</th></tr></thead>
            <tbody>
              <tr *ngFor="let f of filteredLotFields()">
                <td><strong>{{ f.label }}</strong><br><small>{{ f.field }}</small></td>
                <td>{{ f.input_type }}<br><span class="chip" *ngIf="f.required">Obligatorio</span></td>
                <td><small>{{ f.autocomplete || f.notes || f.source }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section *ngIf="section() === 'reglas' && overview()" class="grid-two automotive-grid">
      <article class="card rule-card" *ngFor="let rule of overview()?.automation_rules">
        <span class="chip soft">{{ rule.code }}</span>
        <h3>{{ rule.title }}</h3>
        <p><strong>Disparador:</strong> {{ rule.trigger }}</p>
        <div class="context-chips"><span class="chip" *ngFor="let a of rule.actions">{{ a }}</span></div>
        <p class="muted">{{ rule.configurable ? 'Configurable desde Reglas/Configuración.' : 'Regla del núcleo.' }}</p>
      </article>
      <article class="card rule-card" *ngFor="let rule of overview()?.document_rules">
        <span class="chip soft">{{ rule.code }}</span>
        <h3>{{ rule.title }}</h3>
        <p>{{ rule.description }}</p>
        <div class="context-chips"><span class="chip" *ngFor="let item of rule.applies_to">{{ item }}</span></div>
      </article>
    </section>

    <section *ngIf="section() === 'compatibilidades'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🚘 Árbol de compatibilidades</h3>
        <p class="muted">Marca → Línea/modelo → generación → años → motor → C.C. → combustible. Las sugerencias nacen desde serie motor y catálogos.</p>
        <div class="form-grid">
          <label>Serie motor<input [(ngModel)]="compatibilityForm.engine_series_code" placeholder="D4CB, 4D56, D4EA..." /></label>
          <label>Marca<input [(ngModel)]="compatibilityForm.brand" placeholder="Opcional" /></label>
          <label>Línea/modelo<input [(ngModel)]="compatibilityForm.model" placeholder="Opcional" /></label>
          <label>Año desde<input [(ngModel)]="compatibilityForm.year_from" /></label>
          <label>Año hasta<input [(ngModel)]="compatibilityForm.year_to" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="previewCompatibility()">🔎 Sugerir compatibilidades</button>
        <div class="alert-card compact" *ngIf="compatibilityPreview()?.warnings?.length"><strong>Advertencias:</strong> {{ compatibilityPreview()?.warnings?.join(' · ') }}</div>
      </article>
      <article class="card">
        <h3>Compatibilidades sugeridas</h3>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Marca / Línea</th><th>Motor</th><th>Años</th><th>Notas</th></tr></thead>
            <tbody>
              <tr *ngFor="let item of compatibilityPreview()?.suggested || overview()?.compatibility_templates || []">
                <td><strong>{{ item.brand }}</strong><br><small>{{ item.model }} · {{ item.generation || 'Generación pendiente' }}</small></td>
                <td>{{ item.engine_series }}<br><small>{{ item.fuel_type }} {{ item.displacement_cc }}</small></td>
                <td>{{ item.year_from || '—' }} - {{ item.year_to || '—' }}</td>
                <td><small>{{ item.observations }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section *ngIf="section() === 'sku'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🏷️ Generador SKU inteligente</h3>
        <p class="muted">Basado en las reglas de v13, pero configurable: condición + categoría + serie + característica + correlativo.</p>
        <div class="form-grid">
          <label>Prefijo categoría<input [(ngModel)]="skuForm.category_prefix" placeholder="MOT, CUL, TUR..." /></label>
          <label>Prefijo serie<input [(ngModel)]="skuForm.engine_prefix" placeholder="D4CB, 4D56..." /></label>
          <label>Condición<select [(ngModel)]="skuForm.condition"><option value="usado">Usado</option><option value="nuevo">Nuevo</option><option value="reconstruido">Reconstruido</option></select></label>
          <label>Característica<input [(ngModel)]="skuForm.characteristic" placeholder="Completo, con válvulas..." /></label>
          <label>Correlativo<input type="number" [(ngModel)]="skuForm.sequence" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="previewSku()">⚡ Generar SKU</button>
      </article>
      <article class="card" *ngIf="skuPreview() as s">
        <h3>Resultado</h3>
        <div class="info-list">
          <span>SKU sugerido</span><strong>{{ s.sku }}</strong>
          <span>Código lote sugerido</span><strong>{{ s.lot_code_suggestion }}</strong>
        </div>
        <div class="context-chips"><span class="chip" *ngFor="let e of s.explanation">{{ e }}</span></div>
      </article>
    </section>

    <section *ngIf="section() === 'documentos'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🧾 Descripción automática de línea</h3>
        <p class="muted">Para facturas, salidas y cotizaciones. Se sugiere una descripción completa, pero editable antes de guardar.</p>
        <div class="form-grid">
          <label>SKU<input [(ngModel)]="descriptionForm.sku" /></label>
          <label>Producto<input [(ngModel)]="descriptionForm.product_name" /></label>
          <label>Condición<input [(ngModel)]="descriptionForm.condition" /></label>
          <label>Serie motor<input [(ngModel)]="descriptionForm.engine_series" /></label>
          <label>OEM<input [(ngModel)]="descriptionForm.oem" /></label>
          <label>Lote<input [(ngModel)]="descriptionForm.lot_code" /></label>
          <label>Número motor<input [(ngModel)]="descriptionForm.engine_number" /></label>
          <label>Notas<input [(ngModel)]="descriptionForm.notes" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="previewDescription()">🧾 Generar descripción</button>
      </article>
      <article class="card" *ngIf="descriptionPreview() as d">
        <h3>Descripción sugerida</h3>
        <p class="alert-card compact">{{ d.description }}</p>
        <div class="context-chips"><span class="chip" *ngFor="let p of d.parts_used">{{ p }}</span></div>
      </article>
    </section>


    <section *ngIf="section() === 'busqueda'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🔎 Búsqueda automotriz global</h3>
        <p class="muted">Busca por SKU, OEM, lote, código de barras, QR, número motor, serie, modelo, descripción o notas internas.</p>
        <div class="form-grid">
          <label>Buscar<input [(ngModel)]="searchForm.query" placeholder="Ej. D4CB, 4D56, 22100, lote, número motor..." /></label>
          <label>Límite<input type="number" [(ngModel)]="searchForm.limit" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="runGlobalSearch()">🔎 Buscar en dominio automotriz</button>
        <div class="alert-card compact" *ngIf="searchResponse()?.suggestions?.length"><strong>Sugerencias:</strong> {{ searchResponse()?.suggestions?.join(' · ') }}</div>
      </article>
      <article class="card">
        <h3>Resultados</h3>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Tipo</th><th>Resultado</th><th>Estado</th><th>Acción sugerida</th></tr></thead>
            <tbody>
              <tr *ngFor="let item of searchResponse()?.results || []">
                <td><span class="chip">{{ item.entity }}</span></td>
                <td><strong>{{ item.title }}</strong><br><small>{{ item.subtitle }}</small><br><small>{{ item.code }}</small></td>
                <td>{{ item.status || '—' }}</td>
                <td><small>{{ item.action_hint }}</small></td>
              </tr>
              <tr *ngIf="searchResponse() && !(searchResponse()?.results?.length)"><td colspan="4" class="muted">Sin resultados.</td></tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section *ngIf="section() === 'oem'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🏭 Normalizador OEM</h3>
        <p class="muted">Centraliza OEM principal, equivalentes, proveedor y fabricante para mejorar búsquedas y evitar duplicados.</p>
        <div class="form-grid">
          <label>OEM principal<input [(ngModel)]="oemForm.oem_primary" placeholder="Ej. 22100-4A000" /></label>
          <label>OEM compatibles<textarea [(ngModel)]="oemForm.oem_compatible_codes" placeholder="Separados por coma, punto y coma o |"></textarea></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="normalizeOem()">⚙️ Normalizar OEM</button>
      </article>
      <article class="card" *ngIf="oemPreview() as o">
        <h3>OEM normalizados</h3>
        <div class="info-list">
          <span>Principal</span><strong>{{ o.primary || '—' }}</strong>
          <span>Todos</span><strong>{{ o.normalized || '—' }}</strong>
        </div>
        <div class="context-chips"><span class="chip" *ngFor="let code of o.compatible">{{ code }}</span></div>
        <div class="alert-card compact" *ngIf="o.warnings.length"><strong>Advertencias:</strong> {{ o.warnings.join(' · ') }}</div>
      </article>
    </section>

    <section *ngIf="section() === 'producto-lote'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>📦 Asistente Producto + Lote</h3>
        <p class="muted">Une reglas de producto, lote, SKU, número motor, costo con IVA incluido y siguientes acciones recomendadas.</p>
        <div class="form-grid">
          <label>Producto<input [(ngModel)]="productLotForm.product_name" placeholder="Motor completo, culata, turbo..." /></label>
          <label>SKU manual<input [(ngModel)]="productLotForm.sku" placeholder="Opcional" /></label>
          <label>Categoría<input [(ngModel)]="productLotForm.category_name" placeholder="Motor, Culata, Turbo..." /></label>
          <label>Serie motor<input [(ngModel)]="productLotForm.engine_series_code" placeholder="D4CB, 4D56..." /></label>
          <label>Condición<select [(ngModel)]="productLotForm.condition"><option value="usado">Usado</option><option value="nuevo">Nuevo</option><option value="reconstruido">Reconstruido</option></select></label>
          <label>Código lote<input [(ngModel)]="productLotForm.lot_code" placeholder="Opcional" /></label>
          <label>Número motor<input [(ngModel)]="productLotForm.engine_number" placeholder="Si aplica" /></label>
          <label>Costo unitario<input type="number" [(ngModel)]="productLotForm.unit_cost" /></label>
          <label>Precio venta<input type="number" [(ngModel)]="productLotForm.sale_price" /></label>
          <label>Cantidad inicial<input type="number" [(ngModel)]="productLotForm.quantity" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="runProductLotAssistant()">🧠 Generar guía</button>
      </article>
      <article class="card" *ngIf="productLotPreview() as a">
        <h3>Guía sugerida</h3>
        <h4>Producto</h4>
        <div class="info-list">
          <ng-container *ngFor="let item of objectEntries(a.product_summary)"><span>{{ item[0] }}</span><strong>{{ item[1] || '—' }}</strong></ng-container>
        </div>
        <h4>Lote</h4>
        <div class="info-list">
          <ng-container *ngFor="let item of objectEntries(a.lot_summary)"><span>{{ item[0] }}</span><strong>{{ item[1] || '—' }}</strong></ng-container>
        </div>
        <h4>Campos requeridos</h4>
        <div class="context-chips"><span class="chip" *ngFor="let item of a.required_fields">{{ item }}</span></div>
        <div class="alert-card compact" *ngIf="a.warnings.length"><strong>Advertencias:</strong> {{ a.warnings.join(' · ') }}</div>
        <h4>Siguientes acciones</h4>
        <div class="context-chips"><span class="chip soft" *ngFor="let item of a.next_actions">{{ item }}</span></div>
      </article>
    </section>

    <section *ngIf="section() === 'desarmes' && overview()" class="cards">
      <article class="card rule-card" *ngFor="let rule of overview()?.disassembly_rules">
        <span class="chip soft">{{ rule.code }}</span>
        <h3>{{ rule.title }}</h3>
        <p>{{ rule.description }}</p>
        <div class="context-chips"><span class="chip" *ngFor="let item of rule.applies_to">{{ item }}</span></div>
      </article>
    </section>

    <section *ngIf="section() === 'desarme-operativo'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🧰 Registrar desarme</h3>
        <p class="muted">Desarma un lote marcado como desarmable, descuenta el lote origen, crea lotes hijos y genera Kardex automático.</p>
        <div class="metric-grid pro-metrics" *ngIf="disassemblySummary() as ds">
          <article class="metric"><span>Desarmes</span><strong>{{ ds.total_disassemblies }}</strong><small>Histórico</small></article>
          <article class="metric"><span>Activos</span><strong>{{ ds.active_disassemblies }}</strong><small>Registrados</small></article>
          <article class="metric"><span>Lotes desarmables</span><strong>{{ ds.disassemblable_lots }}</strong><small>Disponibles</small></article>
          <article class="metric"><span>Residuo costo</span><strong>Q {{ ds.pending_cost_review }}</strong><small>Revisión</small></article>
        </div>
        <div class="form-grid">
          <label>ID lote origen<input type="number" [(ngModel)]="disassemblyForm.source_lot_id" /></label>
          <label>Modo<select [(ngModel)]="disassemblyForm.mode"><option value="parcial">Parcial</option><option value="total">Total</option></select></label>
          <label>Cantidad origen<input type="number" [(ngModel)]="disassemblyForm.source_qty" /></label>
          <label>Notas<input [(ngModel)]="disassemblyForm.notes" placeholder="Motivo / referencia interna" /></label>
        </div>
        <h4>Lotes hijos</h4>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Producto ID</th><th>Código lote</th><th>Cant.</th><th>Costo unit.</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let line of disassemblyForm.lines; let i = index">
                <td><input type="number" [(ngModel)]="line.product_id" /></td>
                <td><input [(ngModel)]="line.lot_code" /></td>
                <td><input type="number" [(ngModel)]="line.quantity" /></td>
                <td><input type="number" [(ngModel)]="line.unit_cost" /></td>
                <td><button class="btn ghost" type="button" (click)="removeChildLine(i)">🗑</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="hero-actions">
          <button class="btn" type="button" (click)="addChildLine()">➕ Agregar hijo</button>
          <button class="btn primary wide-auto" type="button" (click)="createDisassembly()">🔧 Registrar desarme</button>
        </div>
        <div class="alert-card compact" *ngIf="disassemblyMessage()">{{ disassemblyMessage() }}</div>
      </article>
      <article class="card">
        <h3>Historial de desarmes</h3>
        <p class="muted">La reversión solo se permite si los lotes hijos no han tenido movimientos posteriores.</p>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Código</th><th>Origen</th><th>Estado</th><th>Costo</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr *ngFor="let item of disassemblies()">
                <td><strong>{{ item.disassembly_code }}</strong><br><small>{{ item.mode }}</small></td>
                <td>Lote #{{ item.source_lot_id }}<br><small>Cant. {{ item.source_qty }}</small></td>
                <td><span class="chip">{{ item.status }}</span></td>
                <td>Q {{ item.total_cost }}<br><small>Asignado Q {{ item.allocated_cost }}</small></td>
                <td><button class="btn ghost" type="button" (click)="reverseDisassembly(item.id)" [disabled]="item.status !== 'registrado'">↩ Reversar</button></td>
              </tr>
              <tr *ngIf="!disassemblies().length"><td colspan="5" class="muted">No hay desarmes registrados.</td></tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section *ngIf="section() === 'asistente'" class="grid-two automotive-grid">
      <article class="card pro-card">
        <h3>🧠 Vista previa de automatización</h3>
        <p class="muted">Simula las reglas que se aplicarán al formulario profesional de producto.</p>
        <div class="form-grid">
          <label>SKU manual<input [(ngModel)]="previewForm.sku" placeholder="Opcional" /></label>
          <label>Nombre<input [(ngModel)]="previewForm.name" placeholder="Ej. Culata completa" /></label>
          <label>Categoría<input [(ngModel)]="previewForm.category_name" placeholder="Ej. Motor, Culata, Turbo" /></label>
          <label>Serie motor<input [(ngModel)]="previewForm.engine_series_code" placeholder="Ej. D4CB, 4D56, D4EA" /></label>
          <label>Precio venta<input type="number" [(ngModel)]="previewForm.price_sale" /></label>
          <label>Precio oferta<input type="number" [(ngModel)]="previewForm.price_offer" /></label>
          <label>% descuento<input type="number" [(ngModel)]="previewForm.discount_percent" /></label>
          <label class="check"><input type="checkbox" [(ngModel)]="previewForm.prices_linked" /> Precios vinculados</label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="runPreview()">⚡ Calcular sugerencias</button>
      </article>
      <article class="card" *ngIf="preview() as p">
        <h3>Resultado sugerido</h3>
        <div class="info-list">
          <span>SKU</span><strong>{{ p.suggested_sku }}</strong>
          <span>Nombre</span><strong>{{ p.suggested_name }}</strong>
          <span>Marca</span><strong>{{ p.brand_name || '—' }}</strong>
          <span>Combustible</span><strong>{{ p.fuel_type || '—' }}</strong>
          <span>C.C.</span><strong>{{ p.displacement_cc || '—' }}</strong>
          <span>Cilindros</span><strong>{{ p.cylinders || '—' }}</strong>
          <span>Precio venta</span><strong>Q {{ p.price_sale }}</strong>
          <span>Precio oferta</span><strong>Q {{ p.price_offer }}</strong>
        </div>
        <h4>Descripción sugerida</h4>
        <p class="alert-card compact">{{ p.description_template }}</p>
        <div class="context-chips"><span class="chip" *ngFor="let r of p.category_rules">{{ r }}</span></div>
        <div class="alert-card compact" *ngIf="p.warnings.length"><strong>Advertencias:</strong><br>{{ p.warnings.join(' · ') }}</div>
      </article>
    </section>

    <section *ngIf="section() === 'v13' && overview()" class="card">
      <h3>📚 Lecciones funcionales recuperadas de v13</h3>
      <ul><li *ngFor="let lesson of overview()?.v13_lessons">{{ lesson }}</li></ul>
      <div class="alert-card compact"><strong>Regla:</strong> v13 aporta conocimiento funcional, campos y flujos. No se copia código, base de datos ni arquitectura.</div>
    </section>
  `,
  styles: [`
    .automotive-hero { display:flex; justify-content:space-between; gap:18px; padding:22px; border-radius:24px; border:1px solid var(--border); background:linear-gradient(135deg, rgba(15,98,254,.12), rgba(16,185,129,.08)); }
    .automotive-grid { align-items:start; }
    .compact-table { max-height: 680px; }
    .rule-card { border-top:4px solid var(--primary); }
    .danger-alert { border-color: rgba(220,38,38,.28); background: rgba(220,38,38,.09); }
    .tabs-wrap { flex-wrap: wrap; }
    @media(max-width: 980px){ .automotive-hero{flex-direction:column;} }
  `]
})
export class AutomotiveComponent implements OnInit {
  overview = signal<AutomotiveOverview | null>(null);
  preview = signal<PreviewResponse | null>(null);
  skuPreview = signal<SkuPreview | null>(null);
  compatibilityPreview = signal<CompatibilityPreview | null>(null);
  descriptionPreview = signal<DescriptionPreview | null>(null);
  searchResponse = signal<AutomotiveSearchResponse | null>(null);
  oemPreview = signal<OemNormalizeResult | null>(null);
  productLotPreview = signal<ProductLotAssistantResult | null>(null);
  disassemblySummary = signal<DisassemblySummary | null>(null);
  disassemblies = signal<DisassemblyRead[]>([]);
  disassemblyMessage = signal('');
  section = signal<AutomotiveSection>('campos');
  loading = signal(false);
  error = signal('');

  previewForm = { sku: '', name: '', category_name: '', engine_series_code: '', price_sale: 0, price_offer: 0, discount_percent: 10, prices_linked: true };
  skuForm = { category_prefix: 'MOT', engine_prefix: 'D4CB', condition: 'usado', characteristic: 'Completo', sequence: 1 };
  compatibilityForm = { engine_series_code: 'D4CB', brand: '', model: '', year_from: '', year_to: '' };
  descriptionForm = { sku: '', product_name: '', condition: '', engine_series: '', oem: '', lot_code: '', engine_number: '', notes: '' };
  searchForm = { query: '', limit: 20 };
  oemForm = { oem_primary: '', oem_compatible_codes: '' };
  productLotForm = { product_name: '', sku: '', category_name: '', engine_series_code: '', condition: 'usado', lot_code: '', engine_number: '', unit_cost: 0, sale_price: 0, quantity: 1 };
  disassemblyForm = { source_lot_id: 0, mode: 'parcial', source_qty: 1, notes: '', lines: [{ product_id: 0, lot_code: '', quantity: 1, unit_cost: 0, description: '', notes: '' }] };

  filteredProductFields = computed(() => this.overview()?.product_fields ?? []);
  filteredLotFields = computed(() => this.overview()?.lot_fields ?? []);

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadOverview(); this.loadDisassemblies(); }

  loadOverview(): void {
    this.loading.set(true); this.error.set('');
    this.http.get<AutomotiveOverview>('http://localhost:8000/api/v1/automotive/overview').subscribe({
      next: data => { this.overview.set(data); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.detail || 'No se pudo cargar Automotriz Pro.'); this.loading.set(false); }
    });
  }

  runPreview(): void {
    this.http.post<PreviewResponse>('http://localhost:8000/api/v1/automotive/automation/preview-product', this.previewForm).subscribe({
      next: data => this.preview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo calcular la automatización.')
    });
  }

  previewSku(): void {
    this.http.post<SkuPreview>('http://localhost:8000/api/v1/automotive/automation/preview-sku', this.skuForm).subscribe({
      next: data => this.skuPreview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo generar el SKU.')
    });
  }

  previewCompatibility(): void {
    this.http.post<CompatibilityPreview>('http://localhost:8000/api/v1/automotive/compatibilities/preview', this.compatibilityForm).subscribe({
      next: data => this.compatibilityPreview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo sugerir compatibilidades.')
    });
  }

  previewDescription(): void {
    this.http.post<DescriptionPreview>('http://localhost:8000/api/v1/automotive/documents/description', this.descriptionForm).subscribe({
      next: data => this.descriptionPreview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo generar la descripción.')
    });
  }


  runGlobalSearch(): void {
    this.http.post<AutomotiveSearchResponse>('http://localhost:8000/api/v1/automotive/search/global', this.searchForm).subscribe({
      next: data => this.searchResponse.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo ejecutar la búsqueda global.')
    });
  }

  normalizeOem(): void {
    this.http.post<OemNormalizeResult>('http://localhost:8000/api/v1/automotive/oem/normalize', this.oemForm).subscribe({
      next: data => this.oemPreview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo normalizar OEM.')
    });
  }

  runProductLotAssistant(): void {
    this.http.post<ProductLotAssistantResult>('http://localhost:8000/api/v1/automotive/product-lot/assistant', this.productLotForm).subscribe({
      next: data => this.productLotPreview.set(data),
      error: err => this.error.set(err?.error?.detail || 'No se pudo generar la guía producto/lote.')
    });
  }

  objectEntries(value: Record<string, string | number | boolean>): [string, string | number | boolean][] {
    return Object.entries(value || {});
  }

  loadDisassemblies(): void {
    this.http.get<DisassemblySummary>('http://localhost:8000/api/v1/disassemblies/summary').subscribe({ next: data => this.disassemblySummary.set(data) });
    this.http.get<DisassemblyRead[]>('http://localhost:8000/api/v1/disassemblies').subscribe({ next: data => this.disassemblies.set(data) });
  }

  addChildLine(): void { this.disassemblyForm.lines = [...this.disassemblyForm.lines, { product_id: 0, lot_code: '', quantity: 1, unit_cost: 0, description: '', notes: '' }]; }
  removeChildLine(index: number): void { this.disassemblyForm.lines = this.disassemblyForm.lines.filter((_, i) => i !== index); }

  createDisassembly(): void {
    this.disassemblyMessage.set('');
    this.http.post<any>('http://localhost:8000/api/v1/disassemblies', this.disassemblyForm).subscribe({
      next: () => {
        this.disassemblyMessage.set('✅ Desarme registrado. Se descontó el lote origen, se crearon lotes hijos y se generó Kardex.');
        this.disassemblyForm = { source_lot_id: 0, mode: 'parcial', source_qty: 1, notes: '', lines: [{ product_id: 0, lot_code: '', quantity: 1, unit_cost: 0, description: '', notes: '' }] };
        this.loadDisassemblies();
      },
      error: err => this.disassemblyMessage.set('❌ ' + (err?.error?.detail || 'No se pudo registrar el desarme.'))
    });
  }

  reverseDisassembly(id: number): void {
    this.disassemblyMessage.set('');
    this.http.post<any>(`http://localhost:8000/api/v1/disassemblies/${id}/reverse?reason=Reversión%20controlada`, {}).subscribe({
      next: () => { this.disassemblyMessage.set('↩ Desarme reversado correctamente.'); this.loadDisassemblies(); },
      error: err => this.disassemblyMessage.set('❌ ' + (err?.error?.detail || 'No se pudo reversar el desarme.'))
    });
  }
}
