import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface MultimediaOverview { total_assets: number; images: number; documents: number; primary_assets: number; trash: number; templates: number; supported_targets: string[]; }
interface MediaAsset { id: number; target_type: string; target_id: number; asset_type: string; title: string; description: string; alt_text: string; source_url: string; mime_type: string; size_bytes: number; tags: string; sort_order: number; is_primary: boolean; origin: string; uploaded_by: string; is_active: boolean; is_deleted: boolean; }
interface LabelTemplate { id: number; code: string; name: string; template_type: string; paper_size: string; width_mm: number; height_mm: number; variables: string; body_template: string; is_default: boolean; is_active: boolean; }
interface QrBarcode { target_type: string; target_id: number; qr_value: string; barcode_value: string; label_hint: string; }
interface LabelPreview { template_code: string; html: string; variables_used: string[]; qr_value: string; barcode_value: string; }

type MediaSection = 'gestor' | 'etiquetas' | 'qr' | 'papelera' | 'arquitectura';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header inventory-hero multimedia-hero">
      <div>
        <span class="eyebrow">📷 Motor Multimedia ERP</span>
        <h1>Multimedia, Etiquetas y Trazabilidad</h1>
        <p>Fotos por producto/lote, archivos, QR, códigos de barras y plantillas de etiqueta sin acoplar WooCommerce al núcleo.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" type="button" (click)="loadAll()">🔄 Actualizar</button>
        <button class="btn" type="button" (click)="section.set('etiquetas')">🏷️ Etiquetas</button>
        <button class="btn primary wide-auto" type="button" (click)="section.set('gestor')">➕ Registrar archivo</button>
      </div>
    </div>

    <section class="metric-grid pro-metrics">
      <article class="metric action-metric" (click)="section.set('gestor')"><span>Archivos</span><strong>{{ overview()?.total_assets || 0 }}</strong><small>Activos</small></article>
      <article class="metric action-metric" (click)="section.set('gestor')"><span>Imágenes</span><strong>{{ overview()?.images || 0 }}</strong><small>Producto / lote</small></article>
      <article class="metric action-metric" (click)="section.set('gestor')"><span>Documentos</span><strong>{{ overview()?.documents || 0 }}</strong><small>PDF, XML, manuales</small></article>
      <article class="metric action-metric" (click)="section.set('etiquetas')"><span>Plantillas</span><strong>{{ overview()?.templates || 0 }}</strong><small>Etiquetas configurables</small></article>
      <article class="metric action-metric" (click)="section.set('papelera')"><span>Papelera</span><strong>{{ overview()?.trash || 0 }}</strong><small>Restaurables</small></article>
    </section>

    <div class="tabs tabs-wrap">
      <button class="tab" [class.active]="section() === 'gestor'" (click)="section.set('gestor')">📷 Gestor</button>
      <button class="tab" [class.active]="section() === 'etiquetas'" (click)="section.set('etiquetas')">🏷️ Etiquetas</button>
      <button class="tab" [class.active]="section() === 'qr'" (click)="section.set('qr')">📱 QR / Barras</button>
      <button class="tab" [class.active]="section() === 'papelera'" (click)="section.set('papelera'); loadTrash()">🗑️ Papelera</button>
      <button class="tab" [class.active]="section() === 'arquitectura'" (click)="section.set('arquitectura')">🧩 Arquitectura</button>
    </div>

    <section *ngIf="error()" class="alert-card danger-alert"><strong>Error:</strong> {{ error() }}</section>
    <section *ngIf="loading()" class="card"><p>⏳ Cargando multimedia...</p></section>

    <section *ngIf="section() === 'gestor'" class="grid-two multimedia-grid">
      <article class="card pro-card">
        <h3>📷 Registrar imagen o archivo</h3>
        <p class="muted">v16.4.0 registra metadata y URL/base64. El almacenamiento físico queda desacoplado para poder conectar disco local, S3, Woo o app móvil sin tocar el núcleo.</p>
        <div class="form-grid">
          <label>Destino
            <select [(ngModel)]="assetForm.target_type"><option value="product">Producto</option><option value="lot">Lote</option><option value="document">Documento</option><option value="customer">Cliente</option><option value="supplier">Proveedor</option></select>
          </label>
          <label>ID destino<input type="number" [(ngModel)]="assetForm.target_id" /></label>
          <label>Tipo
            <select [(ngModel)]="assetForm.asset_type"><option value="image">Imagen</option><option value="pdf">PDF</option><option value="xml">XML</option><option value="document">Documento</option><option value="video">Video</option></select>
          </label>
          <label>Orden<input type="number" [(ngModel)]="assetForm.sort_order" /></label>
          <label>Título<input [(ngModel)]="assetForm.title" placeholder="Foto principal, factura proveedor..." /></label>
          <label>URL / referencia<input [(ngModel)]="assetForm.source_url" placeholder="https://... o ruta futura" /></label>
          <label>Texto ALT<input [(ngModel)]="assetForm.alt_text" placeholder="Motor D4CB lado frontal" /></label>
          <label>Etiquetas<input [(ngModel)]="assetForm.tags" placeholder="motor,d4cb,frontal" /></label>
        </div>
        <label>Descripción<textarea [(ngModel)]="assetForm.description" placeholder="Observaciones internas, estado, detalles de garantía..."></textarea></label>
        <label class="check pill"><input type="checkbox" [(ngModel)]="assetForm.is_primary" /> Marcar como imagen principal</label>
        <button class="btn primary wide-auto" type="button" (click)="saveAsset()">💾 Guardar multimedia</button>
      </article>

      <article class="card">
        <div class="table-header">
          <div><h3>Galería / archivos</h3><p class="muted">La imagen principal queda única por entidad.</p></div>
          <input class="search-inline" [(ngModel)]="filter" placeholder="Filtrar por título, tags, destino..." />
        </div>
        <div class="media-grid-list">
          <div class="media-card" *ngFor="let item of filteredAssets()">
            <div class="media-thumb" [class.has-image]="item.asset_type === 'image' && item.source_url">
              <img *ngIf="item.asset_type === 'image' && item.source_url" [src]="item.source_url" alt="" />
              <span *ngIf="!(item.asset_type === 'image' && item.source_url)">{{ iconFor(item.asset_type) }}</span>
            </div>
            <div class="media-info">
              <strong>{{ item.title || 'Sin título' }}</strong>
              <small>{{ item.target_type }} #{{ item.target_id }} · {{ item.asset_type }}</small>
              <small>{{ item.alt_text || 'Sin ALT' }}</small>
              <div class="context-chips"><span class="chip" *ngIf="item.is_primary">Principal</span><span class="chip soft" *ngFor="let tag of splitTags(item.tags)">{{ tag }}</span></div>
              <div class="quick-actions">
                <button class="btn" type="button" (click)="makePrimary(item)">⭐ Principal</button>
                <button class="btn" type="button" (click)="buildQr(item.target_type, item.target_id)">📱 QR</button>
                <button class="btn" type="button" (click)="trash(item)">🗑️ Papelera</button>
              </div>
            </div>
          </div>
          <div class="mini-help" *ngIf="!filteredAssets().length">Sin multimedia registrada todavía.</div>
        </div>
      </article>
    </section>

    <section *ngIf="section() === 'etiquetas'" class="grid-two multimedia-grid">
      <article class="card pro-card">
        <h3>🏷️ Plantillas de etiqueta</h3>
        <p class="muted">Plantillas base configurables para lotes, productos, motores y documentos.</p>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Código</th><th>Formato</th><th>Variables</th></tr></thead>
            <tbody><tr *ngFor="let t of templates()" (click)="labelForm.template_code = t.code"><td><strong>{{ t.code }}</strong><br><small>{{ t.name }}</small></td><td>{{ t.paper_size }}<br><small>{{ t.width_mm }}x{{ t.height_mm }} mm</small></td><td><small>{{ t.variables }}</small></td></tr></tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h3>Vista previa</h3>
        <div class="form-grid">
          <label>Plantilla<select [(ngModel)]="labelForm.template_code"><option *ngFor="let t of templates()" [value]="t.code">{{ t.code }} - {{ t.name }}</option></select></label>
          <label>Tipo<select [(ngModel)]="labelForm.target_type"><option value="lot">Lote</option><option value="product">Producto</option></select></label>
          <label>ID<input type="number" [(ngModel)]="labelForm.target_id" /></label>
          <label>SKU<input [(ngModel)]="labelForm.sku" /></label>
          <label>Nombre<input [(ngModel)]="labelForm.name" /></label>
          <label>Lote<input [(ngModel)]="labelForm.lot_code" /></label>
          <label>Precio<input [(ngModel)]="labelForm.price" /></label>
          <label>Ubicación<input [(ngModel)]="labelForm.location" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="previewLabel()">👁️ Vista previa</button>
        <div class="label-preview" *ngIf="labelPreview() as preview">
          <div [innerHTML]="preview.html"></div>
          <small>QR: {{ preview.qr_value }}</small><br>
          <small>Código barras: {{ preview.barcode_value }}</small>
        </div>
        <button class="btn" type="button" *ngIf="labelPreview()" (click)="printLabel()">🖨️ Imprimir</button>
      </article>
    </section>

    <section *ngIf="section() === 'qr'" class="grid-two multimedia-grid">
      <article class="card pro-card">
        <h3>📱 QR y código de barras</h3>
        <p class="muted">El QR apunta a la entidad ERP. El código de barras usa SKU/lote para lectores tradicionales.</p>
        <div class="form-grid">
          <label>Tipo<select [(ngModel)]="qrForm.target_type"><option value="product">Producto</option><option value="lot">Lote</option><option value="document">Documento</option></select></label>
          <label>ID<input type="number" [(ngModel)]="qrForm.target_id" /></label>
        </div>
        <button class="btn primary wide-auto" type="button" (click)="buildQr(qrForm.target_type, qrForm.target_id)">⚡ Generar</button>
      </article>
      <article class="card" *ngIf="qrResult() as qr">
        <h3>{{ qr.label_hint }}</h3>
        <div class="qr-box">{{ qr.qr_value }}</div>
        <div class="barcode-box">||||| {{ qr.barcode_value }} |||||</div>
        <p class="muted">En la integración futura se reemplazará esta vista textual por QR/barcode gráfico.</p>
      </article>
    </section>

    <section *ngIf="section() === 'papelera'" class="card">
      <h3>🗑️ Papelera multimedia</h3>
      <div class="table-wrap compact-table">
        <table>
          <thead><tr><th>Archivo</th><th>Destino</th><th>Acción</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of trashAssets()"><td><strong>{{ item.title || 'Sin título' }}</strong><br><small>{{ item.asset_type }} · {{ item.tags }}</small></td><td>{{ item.target_type }} #{{ item.target_id }}</td><td><button class="btn" (click)="restore(item)">♻️ Restaurar</button></td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section *ngIf="section() === 'arquitectura'" class="grid-three">
      <article class="card"><h3>📦 Producto vs lote</h3><p class="muted">Producto guarda fotos genéricas. Lote guarda fotos reales, estado, número motor, daños, accesorios y trazabilidad.</p></article>
      <article class="card"><h3>🔌 Woo desacoplado</h3><p class="muted">WooCommerce no tocará productos/lotes directamente. Consumirá multimedia a través de este motor.</p></article>
      <article class="card"><h3>📄 Documentos</h3><p class="muted">La misma infraestructura soportará PDFs, XML FEL, garantías, manuales, fotografías y videos.</p></article>
    </section>
  `
})
export class MultimediaComponent implements OnInit {
  private api = 'http://127.0.0.1:8000/api/v1/multimedia';
  section = signal<MediaSection>('gestor');
  loading = signal(false);
  error = signal('');
  overview = signal<MultimediaOverview | null>(null);
  assets = signal<MediaAsset[]>([]);
  trashAssets = signal<MediaAsset[]>([]);
  templates = signal<LabelTemplate[]>([]);
  qrResult = signal<QrBarcode | null>(null);
  labelPreview = signal<LabelPreview | null>(null);
  filter = '';

  assetForm: any = { target_type: 'product', target_id: 0, asset_type: 'image', title: '', description: '', alt_text: '', source_url: '', mime_type: '', size_bytes: 0, tags: '', sort_order: 0, is_primary: false, origin: 'erp' };
  qrForm = { target_type: 'lot', target_id: 0 };
  labelForm: any = { template_code: 'LOT_80MM', target_type: 'lot', target_id: 0, sku: '', name: '', lot_code: '', barcode: '', qr_value: '', price: '', location: 'CENTRAL' };

  filteredAssets = computed(() => {
    const q = this.filter.trim().toLowerCase();
    if (!q) return this.assets();
    return this.assets().filter(a => [a.title, a.tags, a.target_type, a.alt_text, a.description].join(' ').toLowerCase().includes(q));
  });

  constructor(private http: HttpClient) {}
  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true); this.error.set('');
    this.http.get<MultimediaOverview>(`${this.api}/overview`).subscribe({ next: r => this.overview.set(r), error: e => this.error.set(this.message(e)) });
    this.http.get<MediaAsset[]>(`${this.api}/assets`).subscribe({ next: r => this.assets.set(r), error: e => this.error.set(this.message(e)) });
    this.http.get<LabelTemplate[]>(`${this.api}/templates`).subscribe({ next: r => { this.templates.set(r); if (r.length && !this.labelForm.template_code) this.labelForm.template_code = r[0].code; }, error: e => this.error.set(this.message(e)), complete: () => this.loading.set(false) });
  }

  loadTrash() { this.http.get<MediaAsset[]>(`${this.api}/assets?include_deleted=true`).subscribe(r => this.trashAssets.set(r.filter(x => x.is_deleted))); }
  saveAsset() { this.http.post<MediaAsset>(`${this.api}/assets`, this.assetForm).subscribe({ next: () => { this.assetForm.title=''; this.assetForm.source_url=''; this.assetForm.alt_text=''; this.assetForm.description=''; this.assetForm.tags=''; this.assetForm.is_primary=false; this.loadAll(); }, error: e => this.error.set(this.message(e)) }); }
  makePrimary(item: MediaAsset) { this.http.post<MediaAsset>(`${this.api}/assets/${item.id}/primary`, {}).subscribe({ next: () => this.loadAll(), error: e => this.error.set(this.message(e)) }); }
  trash(item: MediaAsset) { this.http.post<MediaAsset>(`${this.api}/assets/${item.id}/trash`, {}).subscribe({ next: () => this.loadAll(), error: e => this.error.set(this.message(e)) }); }
  restore(item: MediaAsset) { this.http.post<MediaAsset>(`${this.api}/assets/${item.id}/restore`, {}).subscribe({ next: () => { this.loadAll(); this.loadTrash(); }, error: e => this.error.set(this.message(e)) }); }
  buildQr(target_type: string, target_id: number) { this.section.set('qr'); this.http.get<QrBarcode>(`${this.api}/qr-barcode?target_type=${target_type}&target_id=${target_id || 0}`).subscribe({ next: r => this.qrResult.set(r), error: e => this.error.set(this.message(e)) }); }
  previewLabel() { this.http.post<LabelPreview>(`${this.api}/label-preview`, this.labelForm).subscribe({ next: r => this.labelPreview.set(r), error: e => this.error.set(this.message(e)) }); }
  printLabel() { const html = this.labelPreview()?.html || ''; const w = window.open('', '_blank'); if (w) { w.document.write(`<html><head><title>Etiqueta</title></head><body>${html}</body></html>`); w.document.close(); w.print(); } }
  iconFor(type: string) { return type === 'pdf' ? '📄' : type === 'xml' ? '🧾' : type === 'video' ? '🎞️' : type === 'image' ? '📷' : '📎'; }
  splitTags(tags: string) { return (tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 4); }
  private message(e: any) { return e?.error?.detail || e?.message || 'Error inesperado'; }
}
