import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
const API='http://localhost:8000/api/v1/inventory';

type SortKey = 'name'|'singular_name'|'sku_prefix'|'category_kind'|'sort_order';

@Component({standalone:true,imports:[CommonModule,FormsModule],template:`
<div class="page-header inventory-hero"><div><span class="eyebrow">📂 Inventario · Categorías</span><h1>Categorías</h1><p>Categorías principales y de producto separadas. Las de producto permiten categoría padre tipo WooCommerce, singular automático y prefijo único para lotes.</p></div><div class="hero-actions"><button class="btn" (click)="load()">🔄 Actualizar</button><button class="btn primary wide-auto" (click)="save()">💾 Guardar categoría</button></div></div>

<section class="grid-two category-master-layout">
<article class="card category-form-card"><h3>{{editing?'✏️ Editar':'➕ Nueva'}} categoría</h3>
  <div class="form-grid">
    <label>Tipo<select [(ngModel)]="form.category_kind" (ngModelChange)="onKindChange()"><option value="principal">Categoría principal</option><option value="producto">Categoría producto</option></select></label>
    <label>Nombre<input [(ngModel)]="form.name" (ngModelChange)="onNameChange()" placeholder="Culatas, Turbos, Motores"></label>
    <label>Nombre singular<input [(ngModel)]="form.singular_name" (input)="singularTouched=true" placeholder="Culata, Turbo, Motor"></label>
    <label>Prefijo único<input [(ngModel)]="form.sku_prefix" (input)="prefixTouched=true; form.sku_prefix=(form.sku_prefix||'').toUpperCase()" placeholder="CUL, TUR, MOT"></label>
    <label *ngIf="form.category_kind==='producto'">Categoría padre<select [(ngModel)]="form.parent_id"><option [ngValue]="null">Sin padre</option><option *ngFor="let c of principals()" [ngValue]="c.id">{{c.name}}</option></select></label>
    <label>Imagen categoría / URL<input [(ngModel)]="form.icon" placeholder="URL de imagen o emoji temporal"></label>
    <label>Color<input [(ngModel)]="form.color" placeholder="#0f62fe"></label>
    <label>Orden<input type="number" [(ngModel)]="form.sort_order"></label>
  </div>
  <div class="switch-row switch-row-pro">
    <label class="switch-pill"><input type="checkbox" [(ngModel)]="form.is_active"><span>Activo</span></label>
    <label class="switch-pill"><input type="checkbox" [(ngModel)]="form.handles_inventory"><span>Producto inventariable</span></label>
    <label class="switch-pill"><input type="checkbox" [(ngModel)]="form.requires_engine_series"><span>Requiere serie motor</span></label>
  </div>
  <label>Descripción<textarea [(ngModel)]="form.description"></textarea></label>
  <div class="alert-card mini"><strong>Regla:</strong> el prefijo alimenta códigos de lote por categoría. Es editable y único; no siempre son las primeras 3 letras.</div>
  <div class="quick-actions"><button class="btn" (click)="reset()">Limpiar</button><button class="btn" (click)="forceAuto()">✨ Recalcular singular/prefijo</button></div>
</article>

<article class="card"><div class="table-header"><div><h3>📚 Maestro de categorías</h3><p class="muted">Búsqueda, filtros y ordenamiento compartidos.</p></div><div class="filters-row compact"><input [(ngModel)]="search" placeholder="Buscar nombre, singular, prefijo..."><select [(ngModel)]="kind"><option value="">Todas</option><option value="principal">Principales</option><option value="producto">Producto</option></select></div></div>
  <h3>📁 Categorías principales</h3><div class="table-wrap"><table><thead><tr><th (click)="sortBy('name')">Nombre {{sortIcon('name')}}</th><th (click)="sortBy('singular_name')">Singular {{sortIcon('singular_name')}}</th><th (click)="sortBy('sku_prefix')">Prefijo {{sortIcon('sku_prefix')}}</th><th>Reglas</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let c of filteredPrincipals()"><td><strong><span class="cat-image">{{imageLabel(c)}}</span> {{c.name}}</strong><br><small>{{c.description||'Sin descripción'}}</small></td><td>{{c.singular_name||'—'}}</td><td><span class="chip">{{c.sku_prefix||'—'}}</span></td><td><small>{{c.is_active?'Activo':'Inactivo'}} · {{c.handles_inventory?'Inventario':'Sin inventario'}} · {{c.requires_engine_series?'Serie requerida':'Serie opcional'}}</small></td><td><button class="btn small" (click)="edit(c)">✏️</button></td></tr></tbody></table></div>
  <h3 class="section-title">🏷️ Categorías de producto</h3><div class="table-wrap"><table><thead><tr><th (click)="sortBy('name')">Nombre {{sortIcon('name')}}</th><th>Padre</th><th (click)="sortBy('singular_name')">Singular {{sortIcon('singular_name')}}</th><th (click)="sortBy('sku_prefix')">Prefijo {{sortIcon('sku_prefix')}}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let c of filteredProducts()"><td><strong><span class="cat-image">{{imageLabel(c)}}</span> {{c.name}}</strong><br><small>{{c.description||'Sin descripción'}}</small></td><td>{{name(c.parent_id)}}</td><td>{{c.singular_name||'—'}}</td><td><span class="chip">{{c.sku_prefix||'—'}}</span></td><td>{{c.is_active?'Activo':'Inactivo'}}</td><td><button class="btn small" (click)="edit(c)">✏️</button></td></tr></tbody></table></div>
</article></section>
`})
export class InventoryCategoriesComponent{private http=inject(HttpClient);items=signal<any[]>([]);search='';kind='';editing:any=null;sortKey:SortKey='name';sortDir:1|-1=1;singularTouched=false;prefixTouched=false;form:any=this.blank();principals=computed(()=>this.items().filter(c=>c.category_kind==='principal'));products=computed(()=>this.items().filter(c=>c.category_kind==='producto'));filteredPrincipals=computed(()=>this.filter(this.principals()));filteredProducts=computed(()=>this.filter(this.products()));constructor(){this.load();}
blank(){return{name:'',singular_name:'',description:'',parent_id:null,category_kind:'producto',sku_prefix:'',icon:'',color:'',sort_order:0,requires_engine_series:false,handles_inventory:true,is_active:true};}
load(){this.http.get<any[]>(`${API}/categories`).subscribe(v=>this.items.set(v));}
filter(rows:any[]){const q=this.search.toLowerCase().trim();return rows.filter(c=>(!this.kind||c.category_kind===this.kind)&&(!q||[c.name,c.singular_name,c.description,c.sku_prefix,this.name(c.parent_id)].join(' ').toLowerCase().includes(q))).sort((a,b)=>String(a[this.sortKey]??'').localeCompare(String(b[this.sortKey]??''),undefined,{numeric:true})*this.sortDir);}
singular(v:string){v=(v||'').trim();if(!v)return'';const l=v.toLowerCase(); if(l.endsWith('ciones'))return v.slice(0,-3)+'ón'; if(l.endsWith('res'))return v.slice(0,-2); if(l.endsWith('es')&&v.length>4)return v.slice(0,-2); if(l.endsWith('s')&&v.length>3)return v.slice(0,-1);return v;}
prefix(v:string){return (v||'LOT').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').substring(0,3).toUpperCase()||'LOT';}
onNameChange(){ if(!this.singularTouched) this.form.singular_name=this.singular(this.form.name); if(!this.prefixTouched) this.form.sku_prefix=this.prefix(this.form.name); }
onKindChange(){ if(this.form.category_kind==='principal') this.form.parent_id=null; }
forceAuto(){this.form.singular_name=this.singular(this.form.name);this.form.sku_prefix=this.prefix(this.form.name);this.singularTouched=false;this.prefixTouched=false;}
name(id:any){return this.items().find(c=>Number(c.id)===Number(id))?.name||'—';}
imageLabel(c:any){const v=(c.icon||'').trim();return v&&v.startsWith('http')?'🖼️':(v||'📂');}
reset(){this.editing=null;this.form=this.blank();this.singularTouched=false;this.prefixTouched=false;}
edit(c:any){this.editing=c;this.form={...this.blank(),...c};this.singularTouched=true;this.prefixTouched=true;}
sortBy(k:SortKey){if(this.sortKey===k)this.sortDir=this.sortDir===1?-1:1;else{this.sortKey=k;this.sortDir=1;}}
sortIcon(k:SortKey){return this.sortKey===k?(this.sortDir===1?'↑':'↓'):'';}
save(){if(!this.form.name){alert('Nombre requerido');return;} if(!this.form.singular_name)this.form.singular_name=this.singular(this.form.name); if(!this.form.sku_prefix)this.form.sku_prefix=this.prefix(this.form.name); this.form.sku_prefix=String(this.form.sku_prefix).toUpperCase(); const req=this.editing?this.http.put(`${API}/categories/${this.editing.id}`,this.form):this.http.post(`${API}/categories`,this.form);req.subscribe({next:()=>{this.load();this.reset();},error:e=>alert(e?.error?.detail||'No se pudo guardar')});}}
