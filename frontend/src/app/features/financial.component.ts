import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

const API = 'http://localhost:8000/api/v1';

type Summary = { active_cash_sessions:number; cash_expected:any; payments_total:any; payments_today:any; pending_receivables:any; overdue_receivables:any; bank_balance:any; deposits_total:any; };
type Invoice = { id:number; invoice_code:string; client_name:string; client_tax_id:string; status:string; total:any; };
type Receivable = { invoice_id:number; invoice_code:string; client_name:string; client_tax_id:string; status:string; total:any; paid:any; balance:any; payment_status:string; };
type Payment = { id:number; payment_code:string; invoice_id:number|null; cash_session_id:number|null; customer_name:string; customer_tax_id:string; method:string; payment_type:string; status:string; amount:any; reference:string; notes:string; created_at:string; };
type CashSession = { id:number; session_code:string; cashier_name:string; status:string; opening_amount:any; expected_amount:any; counted_amount:any; difference_amount:any; notes:string; created_at:string; closed_at:string|null; };
type BankAccount = { id:number; name:string; bank_name:string; account_number:string; currency:string; current_balance:any; is_active:boolean; notes:string; };
type Deposit = { id:number; deposit_code:string; bank_account_id:number|null; amount:any; method:string; reference:string; status:string; notes:string; created_at:string; };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toast" *ngIf="toast()">{{ toast() }}</div>

    <section class="finance-hero">
      <div>
        <span class="eyebrow">💵 ERP v15.3.0 · Workspace Financiero</span>
        <h1>Caja / Cobros Profesional</h1>
        <p>Caja diaria, cobros, anticipos, saldos pendientes, bancos y depósitos en un solo centro de trabajo.</p>
      </div>
      <div class="hero-actions">
        <button class="btn" (click)="loadAll()" [disabled]="busy()">🔄 Actualizar</button>
        <button class="btn primary" (click)="tab.set('caja')">💵 Abrir caja</button>
      </div>
    </section>

    <section class="workspace-toolbar">
      <button class="tool" [class.active]="tab()==='dashboard'" (click)="tab.set('dashboard')">📊 Panel</button>
      <button class="tool" [class.active]="tab()==='caja'" (click)="tab.set('caja')">💵 Caja</button>
      <button class="tool" [class.active]="tab()==='cobros'" (click)="tab.set('cobros')">💳 Cobros</button>
      <button class="tool" [class.active]="tab()==='pendientes'" (click)="tab.set('pendientes')">🧾 Pendientes</button>
      <button class="tool" [class.active]="tab()==='bancos'" (click)="tab.set('bancos')">🏦 Bancos</button>
      <button class="tool" [class.active]="tab()==='timeline'" (click)="tab.set('timeline')">🕓 Timeline</button>
      <button class="tool" (click)="printSummary()">🖨️ Resumen</button>
    </section>

    <section class="search-panel">
      <div><strong>🔎 Búsqueda financiera</strong><p>Busca factura, cliente, cobro, caja, depósito o referencia.</p></div>
      <input [(ngModel)]="search" placeholder="Buscar FAC, NIT, cliente, COB, DEP..." />
    </section>

    <section class="kpi-grid">
      <button class="kpi" (click)="tab.set('caja')"><span>Cajas abiertas</span><strong>{{ summary().active_cash_sessions || 0 }}</strong><small>Sesiones activas</small></button>
      <button class="kpi" (click)="tab.set('caja')"><span>Efectivo esperado</span><strong>Q {{ money(summary().cash_expected) }}</strong><small>Caja diaria</small></button>
      <button class="kpi" (click)="tab.set('cobros')"><span>Cobrado hoy</span><strong>Q {{ money(summary().payments_today) }}</strong><small>Todos los métodos</small></button>
      <button class="kpi warning" (click)="tab.set('pendientes')"><span>Por cobrar</span><strong>Q {{ money(summary().pending_receivables) }}</strong><small>Facturas con saldo</small></button>
      <button class="kpi" (click)="tab.set('bancos')"><span>Bancos</span><strong>Q {{ money(summary().bank_balance) }}</strong><small>Saldo registrado</small></button>
      <button class="kpi" (click)="tab.set('bancos')"><span>Depósitos</span><strong>Q {{ money(summary().deposits_total) }}</strong><small>Total histórico</small></button>
    </section>

    <section class="alert" *ngIf="alert()"><strong>{{ alert() }}</strong><button class="btn small" (click)="alert.set('')">Cerrar</button></section>

    <section class="finance-grid" *ngIf="tab()==='dashboard'">
      <article class="card wide">
        <h3>⭐ Centro de operaciones financiero</h3>
        <div class="ops-grid">
          <button class="ops" (click)="tab.set('pendientes')">🧾 <strong>{{ receivables().length }}</strong><span>Facturas con saldo</span></button>
          <button class="ops" (click)="tab.set('caja')">💵 <strong>{{ openSessions().length }}</strong><span>Cajas abiertas</span></button>
          <button class="ops" (click)="tab.set('cobros')">💳 <strong>{{ payments().length }}</strong><span>Cobros registrados</span></button>
          <button class="ops" (click)="tab.set('bancos')">🏦 <strong>{{ bankAccounts().length }}</strong><span>Cuentas bancarias</span></button>
        </div>
      </article>
      <article class="card">
        <h3>⚡ Acciones rápidas</h3>
        <div class="action-list">
          <button class="btn primary" (click)="openCash()">💵 Abrir caja</button>
          <button class="btn" (click)="tab.set('pendientes')">🧾 Cobrar factura</button>
          <button class="btn" (click)="tab.set('bancos')">🏦 Registrar banco</button>
          <button class="btn" (click)="tab.set('timeline')">🕓 Ver timeline</button>
        </div>
      </article>
      <article class="card wide">
        <h3>🔎 Resultados de búsqueda</h3>
        <p class="muted" *ngIf="!search.trim()">Escribe para buscar dentro del Workspace Financiero.</p>
        <div class="result-list" *ngIf="search.trim()">
          <button class="result" *ngFor="let r of globalResults().slice(0,12)" (click)="openResult(r)"><strong>{{ r.icon }} {{ r.title }}</strong><span>{{ r.subtitle }}</span></button>
        </div>
      </article>
    </section>

    <section class="split-layout" *ngIf="tab()==='caja'">
      <article class="card table-card">
        <div class="section-head"><div><h3>💵 Caja diaria</h3><p>Apertura, cierre y arqueo básico.</p></div><button class="btn primary" (click)="openCash()">Abrir caja</button></div>
        <table><thead><tr><th>Código</th><th>Cajero</th><th>Estado</th><th>Inicial</th><th>Esperado</th><th>Diferencia</th><th>Acciones</th></tr></thead><tbody>
          <tr *ngFor="let s of sessions()" [class.selected]="selectedSession()?.id===s.id" (click)="selectedSession.set(s)">
            <td><strong>{{ s.session_code }}</strong></td><td>{{ s.cashier_name }}</td><td><span class="state" [class.closed]="s.status==='cerrada'">{{ s.status }}</span></td><td>Q {{ money(s.opening_amount) }}</td><td>Q {{ money(s.expected_amount) }}</td><td>Q {{ money(s.difference_amount) }}</td><td><button class="btn small" [disabled]="s.status==='cerrada'" (click)="$event.stopPropagation(); closePrompt(s)">Cerrar</button></td>
          </tr>
        </tbody></table>
      </article>
      <aside class="card context-panel">
        <h3>🧮 Arqueo</h3>
        <ng-container *ngIf="selectedSession(); else noSession">
          <div class="summary-list"><span>Caja</span><strong>{{ selectedSession()?.session_code }}</strong><span>Esperado</span><strong>Q {{ money(selectedSession()?.expected_amount) }}</strong></div>
          <label>Monto contado<input type="number" [(ngModel)]="closeForm.counted_amount" /></label>
          <label>Notas<textarea [(ngModel)]="closeForm.notes"></textarea></label>
          <button class="btn primary" [disabled]="selectedSession()?.status==='cerrada'" (click)="closeCash(selectedSession())">Cerrar caja</button>
        </ng-container>
        <ng-template #noSession><p class="muted">Selecciona una caja para revisar cierre, esperado y diferencia.</p></ng-template>
      </aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='cobros'">
      <article class="card table-card">
        <div class="section-head"><div><h3>💳 Cobros registrados</h3><p>Abonos, anticipos y pagos aplicados.</p></div><input [(ngModel)]="search" placeholder="Buscar cobro..." /></div>
        <table><thead><tr><th>Código</th><th>Cliente</th><th>Método</th><th>Tipo</th><th>Monto</th><th>Referencia</th></tr></thead><tbody>
          <tr *ngFor="let p of filteredPayments()"><td><strong>{{ p.payment_code }}</strong></td><td>{{ p.customer_name }}<br><small>{{ p.customer_tax_id }}</small></td><td>{{ p.method }}</td><td>{{ p.payment_type }}</td><td>Q {{ money(p.amount) }}</td><td>{{ p.reference || '—' }}</td></tr>
        </tbody></table>
      </article>
      <aside class="card context-panel"><h3>➕ Cobro rápido</h3><label>Cliente<input [(ngModel)]="paymentForm.customer_name" /></label><label>NIT<input [(ngModel)]="paymentForm.customer_tax_id" /></label><label>Monto<input type="number" [(ngModel)]="paymentForm.amount" /></label><label>Método<select [(ngModel)]="paymentForm.method"><option>efectivo</option><option>tarjeta</option><option>transferencia</option><option>cheque</option></select></label><label>Referencia<input [(ngModel)]="paymentForm.reference" /></label><button class="btn primary" (click)="createPayment()">Registrar cobro</button></aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='pendientes'">
      <article class="card table-card">
        <div class="section-head"><div><h3>🧾 Facturas pendientes de cobro</h3><p>Saldo calculado contra cobros aplicados.</p></div><input [(ngModel)]="search" placeholder="Buscar factura o cliente..." /></div>
        <table><thead><tr><th>Factura</th><th>Cliente</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Acción</th></tr></thead><tbody>
          <tr *ngFor="let r of filteredReceivables()" [class.selected]="selectedReceivable()?.invoice_id===r.invoice_id" (click)="selectedReceivable.set(r)"><td><strong>{{ r.invoice_code }}</strong></td><td>{{ r.client_name }}<br><small>{{ r.client_tax_id }}</small></td><td>Q {{ money(r.total) }}</td><td>Q {{ money(r.paid) }}</td><td><strong>Q {{ money(r.balance) }}</strong></td><td><button class="btn small primary" (click)="$event.stopPropagation(); preparePayment(r)">Cobrar</button></td></tr>
        </tbody></table>
      </article>
      <aside class="card context-panel"><h3>💰 Aplicar abono</h3><ng-container *ngIf="selectedReceivable(); else noRec"><div class="summary-list"><span>Factura</span><strong>{{ selectedReceivable()?.invoice_code }}</strong><span>Saldo</span><strong>Q {{ money(selectedReceivable()?.balance) }}</strong></div><label>Monto<input type="number" [(ngModel)]="paymentForm.amount" /></label><label>Método<select [(ngModel)]="paymentForm.method"><option>efectivo</option><option>tarjeta</option><option>transferencia</option><option>cheque</option></select></label><label>Referencia<input [(ngModel)]="paymentForm.reference" /></label><button class="btn primary" (click)="createPayment()">Aplicar cobro</button></ng-container><ng-template #noRec><p class="muted">Selecciona una factura pendiente para registrar un abono.</p></ng-template></aside>
    </section>

    <section class="split-layout" *ngIf="tab()==='bancos'">
      <article class="card table-card"><div class="section-head"><div><h3>🏦 Bancos y depósitos</h3><p>Cuentas bancarias y depósitos registrados.</p></div></div><table><thead><tr><th>Cuenta</th><th>Banco</th><th>Número</th><th>Saldo</th><th>Acción</th></tr></thead><tbody><tr *ngFor="let b of bankAccounts()"><td><strong>{{ b.name }}</strong></td><td>{{ b.bank_name }}</td><td>{{ b.account_number }}</td><td>Q {{ money(b.current_balance) }}</td><td><button class="btn small" (click)="depositForm.bank_account_id=b.id">Depositar</button></td></tr></tbody></table><h4>Depósitos recientes</h4><div class="mini-line" *ngFor="let d of deposits().slice(0,8)"><span>{{ d.deposit_code }} · {{ d.reference || 'sin referencia' }}</span><strong>Q {{ money(d.amount) }}</strong></div></article>
      <aside class="card context-panel"><h3>➕ Banco / depósito</h3><label>Nombre cuenta<input [(ngModel)]="bankForm.name" /></label><label>Banco<input [(ngModel)]="bankForm.bank_name" /></label><label>Número<input [(ngModel)]="bankForm.account_number" /></label><button class="btn" (click)="createBank()">Crear cuenta</button><hr><label>Cuenta<select [(ngModel)]="depositForm.bank_account_id"><option [ngValue]="null">Sin cuenta</option><option *ngFor="let b of bankAccounts()" [ngValue]="b.id">{{ b.name }}</option></select></label><label>Monto depósito<input type="number" [(ngModel)]="depositForm.amount" /></label><label>Referencia<input [(ngModel)]="depositForm.reference" /></label><button class="btn primary" (click)="createDeposit()">Registrar depósito</button></aside>
    </section>

    <section class="finance-grid" *ngIf="tab()==='timeline'">
      <article class="card wide"><h3>🕓 SmartTimeline financiero</h3><p class="muted">Primer timeline unificado de caja, cobros y depósitos.</p><div class="timeline"><div class="event" *ngFor="let e of timeline()"><span>{{ e.icon }}</span><div><strong>{{ e.title }}</strong><p>{{ e.detail }}</p><small>{{ e.date }}</small></div></div></div></article>
      <article class="card"><h3>📌 Siguiente integración</h3><p>Este Workspace queda preparado para Caja completa, cuentas por cobrar, bancos, depósitos, reportes y futura contabilidad.</p></article>
    </section>
  `,
  styles: [`
    :host{display:block}.finance-hero{display:flex;justify-content:space-between;gap:24px;align-items:center;padding:28px;border-radius:28px;background:linear-gradient(135deg,#065f46,#1e3a8a);color:white;margin-bottom:18px;box-shadow:0 20px 50px rgba(30,58,138,.22)}.finance-hero h1{font-size:34px;margin:6px 0}.finance-hero p{max-width:760px;opacity:.9}.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:12px;opacity:.85}.hero-actions,.action-list{display:flex;gap:10px;flex-wrap:wrap}.btn{border:1px solid rgba(148,163,184,.35);background:var(--surface-card,#fff);color:inherit;border-radius:14px;padding:10px 14px;cursor:pointer;font-weight:800}.btn.primary{background:#0f766e;color:white;border-color:#0f766e}.btn.small{padding:7px 10px;font-size:12px}.btn:disabled{opacity:.55;cursor:not-allowed}.workspace-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.tool{border:0;background:#eef2ff;padding:10px 13px;border-radius:14px;font-weight:800;cursor:pointer}.tool.active{background:#0f766e;color:white}.search-panel,.alert{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:22px;padding:16px;margin:14px 0}.search-panel input,.section-head input,input,select,textarea{border:1px solid #d1d5db;border-radius:12px;padding:10px;background:#fff;min-width:0}.search-panel input{width:min(520px,55vw)}.kpi-grid{display:grid;grid-template-columns:repeat(6,minmax(130px,1fr));gap:12px;margin:16px 0}.kpi{display:flex;flex-direction:column;text-align:left;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:16px;cursor:pointer}.kpi strong{font-size:24px}.kpi small,.muted{color:#64748b}.kpi.warning strong{color:#b45309}.card{background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:18px;box-shadow:0 12px 30px rgba(15,23,42,.05)}.finance-grid{display:grid;grid-template-columns:2fr 1fr;gap:16px}.ops-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ops{border:1px solid #e5e7eb;background:#f8fafc;border-radius:18px;padding:16px;text-align:left;cursor:pointer}.ops strong{font-size:24px;margin:0 8px}.result-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.result{display:flex;flex-direction:column;align-items:flex-start;border:1px solid #e5e7eb;background:#fff;border-radius:14px;padding:12px;cursor:pointer}.split-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(360px,.85fr);gap:16px}.section-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.table-card table{width:100%;border-collapse:collapse}.table-card th,.table-card td{border-bottom:1px solid #e5e7eb;padding:10px;text-align:left}.table-card tr{cursor:pointer}.table-card tr.selected{background:#ecfeff}.state{background:#dcfce7;border-radius:999px;padding:6px 10px;font-weight:800}.state.closed{background:#e5e7eb}.context-panel{position:sticky;top:16px;align-self:start}.summary-list{display:grid;grid-template-columns:1fr auto;gap:8px;background:#f8fafc;border-radius:16px;padding:14px;margin:12px 0}.mini-line{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #e5e7eb;padding:8px 0}.timeline{display:flex;flex-direction:column;gap:12px}.event{display:grid;grid-template-columns:44px 1fr;gap:10px;border:1px solid #e5e7eb;border-radius:16px;padding:12px}.event>span{font-size:24px}.toast{position:fixed;right:20px;top:20px;z-index:50;background:#0f766e;color:white;padding:12px 16px;border-radius:14px;box-shadow:0 16px 40px rgba(0,0,0,.18)}label{display:flex;flex-direction:column;gap:6px;margin:10px 0;font-weight:700}@media(max-width:1100px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.split-layout,.finance-grid{grid-template-columns:1fr}.context-panel{position:static}.ops-grid,.result-list{grid-template-columns:1fr}.search-panel{display:block}.search-panel input{width:100%;margin-top:10px}}`]
})
export class FinancialComponent {
  private http = inject(HttpClient);
  busy = signal(false); toast = signal(''); alert = signal('');
  tab = signal<'dashboard'|'caja'|'cobros'|'pendientes'|'bancos'|'timeline'>('dashboard');
  summary = signal<Summary>({active_cash_sessions:0,cash_expected:0,payments_total:0,payments_today:0,pending_receivables:0,overdue_receivables:0,bank_balance:0,deposits_total:0});
  invoices = signal<Invoice[]>([]); receivables = signal<Receivable[]>([]); payments = signal<Payment[]>([]); sessions = signal<CashSession[]>([]); bankAccounts = signal<BankAccount[]>([]); deposits = signal<Deposit[]>([]);
  selectedSession = signal<CashSession|null>(null); selectedReceivable = signal<Receivable|null>(null); search='';
  paymentForm:any = { invoice_id:null, customer_name:'Consumidor final', customer_tax_id:'CF', method:'efectivo', payment_type:'abono', amount:0, reference:'', notes:'' };
  closeForm:any = { counted_amount:0, notes:'' };
  bankForm:any = { name:'Banco principal', bank_name:'', account_number:'', currency:'GTQ', current_balance:0, notes:'' };
  depositForm:any = { bank_account_id:null, amount:0, method:'deposito', reference:'', notes:'' };
  constructor(){ this.loadAll(); }
  loadAll(){ this.busy.set(true); Promise.all([this.getSummary(),this.getInvoices(),this.getReceivables(),this.getPayments(),this.getSessions(),this.getBanks(),this.getDeposits()]).finally(()=>this.busy.set(false)); }
  getSummary(){ return new Promise<void>(r=>this.http.get<Summary>(`${API}/financial/summary`).subscribe({next:v=>{this.summary.set(v);r();},error:()=>r()})); }
  getInvoices(){ return new Promise<void>(r=>this.http.get<Invoice[]>(`${API}/inventory/sales-invoices`).subscribe({next:v=>{this.invoices.set(v);r();},error:()=>r()})); }
  getReceivables(){ return new Promise<void>(r=>this.http.get<Receivable[]>(`${API}/financial/receivables`).subscribe({next:v=>{this.receivables.set(v);r();},error:()=>r()})); }
  getPayments(){ return new Promise<void>(r=>this.http.get<Payment[]>(`${API}/financial/payments`).subscribe({next:v=>{this.payments.set(v);r();},error:()=>r()})); }
  getSessions(){ return new Promise<void>(r=>this.http.get<CashSession[]>(`${API}/financial/cash-sessions`).subscribe({next:v=>{this.sessions.set(v); if(!this.selectedSession()&&v.length)this.selectedSession.set(v[0]); r();},error:()=>r()})); }
  getBanks(){ return new Promise<void>(r=>this.http.get<BankAccount[]>(`${API}/financial/bank-accounts`).subscribe({next:v=>{this.bankAccounts.set(v);r();},error:()=>r()})); }
  getDeposits(){ return new Promise<void>(r=>this.http.get<Deposit[]>(`${API}/financial/deposits`).subscribe({next:v=>{this.deposits.set(v);r();},error:()=>r()})); }
  money(v:any){ return Number(v||0).toFixed(2); }
  openSessions(){ return this.sessions().filter(s=>s.status==='abierta'); }
  openCash(){ this.http.post<CashSession>(`${API}/financial/cash-sessions`, { cashier_name:'Administrador', opening_amount:0, notes:'Apertura desde Workspace Financiero' }).subscribe({next:s=>{this.toast.set('Caja abierta');this.selectedSession.set(s);this.loadAll();setTimeout(()=>this.toast.set(''),2200);},error:e=>this.alert.set(e?.error?.detail||'No se pudo abrir caja')}); }
  closePrompt(s:CashSession){ this.selectedSession.set(s); this.closeForm.counted_amount=Number(s.expected_amount||0); }
  closeCash(s:CashSession|null){ if(!s)return; this.http.post<CashSession>(`${API}/financial/cash-sessions/${s.id}/close`, this.closeForm).subscribe({next:()=>{this.toast.set('Caja cerrada');this.loadAll();setTimeout(()=>this.toast.set(''),2200);},error:e=>this.alert.set(e?.error?.detail||'No se pudo cerrar caja')}); }
  preparePayment(r:Receivable){ this.selectedReceivable.set(r); this.paymentForm={invoice_id:r.invoice_id, customer_name:r.client_name, customer_tax_id:r.client_tax_id, method:'efectivo', payment_type:'abono', amount:Number(r.balance||0), reference:r.invoice_code, notes:''}; }
  createPayment(){ this.http.post<Payment>(`${API}/financial/payments`, this.paymentForm).subscribe({next:()=>{this.toast.set('Cobro registrado');this.paymentForm={invoice_id:null, customer_name:'Consumidor final', customer_tax_id:'CF', method:'efectivo', payment_type:'abono', amount:0, reference:'', notes:''};this.loadAll();setTimeout(()=>this.toast.set(''),2200);},error:e=>this.alert.set(e?.error?.detail||'No se pudo registrar el cobro')}); }
  createBank(){ if(!this.bankForm.name?.trim()){this.alert.set('Ingresa nombre de cuenta.');return;} this.http.post<BankAccount>(`${API}/financial/bank-accounts`, this.bankForm).subscribe({next:()=>{this.toast.set('Cuenta creada');this.loadAll();setTimeout(()=>this.toast.set(''),2200);},error:e=>this.alert.set(e?.error?.detail||'No se pudo crear cuenta')}); }
  createDeposit(){ this.http.post<Deposit>(`${API}/financial/deposits`, this.depositForm).subscribe({next:()=>{this.toast.set('Depósito registrado');this.depositForm={bank_account_id:null, amount:0, method:'deposito', reference:'', notes:''};this.loadAll();setTimeout(()=>this.toast.set(''),2200);},error:e=>this.alert.set(e?.error?.detail||'No se pudo registrar depósito')}); }
  filteredPayments(){ const q=this.search.toLowerCase(); return this.payments().filter(p=>!q||[p.payment_code,p.customer_name,p.customer_tax_id,p.method,p.reference].join(' ').toLowerCase().includes(q)); }
  filteredReceivables(){ const q=this.search.toLowerCase(); return this.receivables().filter(r=>!q||[r.invoice_code,r.client_name,r.client_tax_id,r.status].join(' ').toLowerCase().includes(q)); }
  globalResults(){ const q=this.search.toLowerCase(); if(!q)return [] as any[]; return [
    ...this.receivables().filter(r=>[r.invoice_code,r.client_name,r.client_tax_id].join(' ').toLowerCase().includes(q)).map(r=>({icon:'🧾',title:r.invoice_code,subtitle:`${r.client_name} · saldo Q ${this.money(r.balance)}`,tab:'pendientes',data:r})),
    ...this.payments().filter(p=>[p.payment_code,p.customer_name,p.reference].join(' ').toLowerCase().includes(q)).map(p=>({icon:'💳',title:p.payment_code,subtitle:`${p.customer_name} · Q ${this.money(p.amount)}`,tab:'cobros',data:p})),
    ...this.sessions().filter(s=>[s.session_code,s.cashier_name,s.status].join(' ').toLowerCase().includes(q)).map(s=>({icon:'💵',title:s.session_code,subtitle:`${s.status} · Q ${this.money(s.expected_amount)}`,tab:'caja',data:s})),
    ...this.deposits().filter(d=>[d.deposit_code,d.reference,d.method].join(' ').toLowerCase().includes(q)).map(d=>({icon:'🏦',title:d.deposit_code,subtitle:`${d.reference} · Q ${this.money(d.amount)}`,tab:'bancos',data:d}))
  ]; }
  openResult(r:any){ this.tab.set(r.tab); if(r.tab==='pendientes'){this.selectedReceivable.set(r.data);} if(r.tab==='caja'){this.selectedSession.set(r.data);} }
  timeline(){ return [
    ...this.payments().slice(0,20).map(p=>({icon:'💳',title:p.payment_code,detail:`${p.customer_name} · ${p.method} · Q ${this.money(p.amount)}`,date:new Date(p.created_at).toLocaleString()})),
    ...this.sessions().slice(0,10).map(s=>({icon:'💵',title:s.session_code,detail:`Caja ${s.status} · esperado Q ${this.money(s.expected_amount)}`,date:new Date(s.created_at).toLocaleString()})),
    ...this.deposits().slice(0,10).map(d=>({icon:'🏦',title:d.deposit_code,detail:`Depósito · Q ${this.money(d.amount)} · ${d.reference}`,date:new Date(d.created_at).toLocaleString()}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,30); }
  printSummary(){ const w=window.open('', '_blank'); if(!w)return; w.document.write(`<h1>Resumen financiero</h1><p>Cobrado hoy: Q ${this.money(this.summary().payments_today)}</p><p>Por cobrar: Q ${this.money(this.summary().pending_receivables)}</p><p>Caja esperada: Q ${this.money(this.summary().cash_expected)}</p><p>Bancos: Q ${this.money(this.summary().bank_balance)}</p>`); w.print(); w.close(); }
}
