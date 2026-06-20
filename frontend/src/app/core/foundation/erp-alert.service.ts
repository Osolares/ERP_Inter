import { Injectable, signal } from '@angular/core';

export type ERPAlertType = 'success' | 'danger' | 'warning' | 'info';

export interface ERPAlertState {
  icon: string;
  type: ERPAlertType;
  title: string;
  message: string;
  detail?: string;
  confirm?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ERPAlertService {
  alert = signal<ERPAlertState | null>(null);
  toast = signal('');
  private action: (() => void) | null = null;

  success(message: string, title = 'Operación realizada', detail = ''): void {
    this.open('success', title, message, detail);
  }

  error(message: string, title = 'Acción no completada', detail = ''): void {
    this.open('danger', title, message, detail);
  }

  warning(message: string, title = 'Advertencia', detail = ''): void {
    this.open('warning', title, message, detail);
  }

  info(message: string, title = 'Información', detail = ''): void {
    this.open('info', title, message, detail);
  }

  notify(message: string, milliseconds = 2800): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), milliseconds);
  }

  confirm(message: string, action: () => void, title = 'Confirmar acción', detail = ''): void {
    this.action = action;
    this.alert.set({ icon: '⚠️', type: 'warning', title, message, detail, confirm: true });
  }

  close(): void {
    this.alert.set(null);
    this.action = null;
  }

  accept(): void {
    const action = this.action;
    this.close();
    if (action) action();
  }

  private open(type: ERPAlertType, title: string, message: string, detail = ''): void {
    const icons: Record<ERPAlertType, string> = { success: '✅', danger: '🛑', warning: '⚠️', info: 'ℹ️' };
    this.action = null;
    this.alert.set({ icon: icons[type], type, title, message, detail, confirm: false });
  }
}
