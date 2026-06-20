import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ERPLoadingService {
  private activeKeys = signal<Set<string>>(new Set<string>());

  isLoading(key: string): boolean {
    return this.activeKeys().has(key);
  }

  start(key: string): void {
    const next = new Set(this.activeKeys());
    next.add(key);
    this.activeKeys.set(next);
  }

  stop(key: string): void {
    const next = new Set(this.activeKeys());
    next.delete(key);
    this.activeKeys.set(next);
  }

  async run<T>(key: string, work: () => Promise<T>): Promise<T> {
    if (this.isLoading(key)) throw new Error('La operación ya está en proceso.');
    this.start(key);
    try { return await work(); }
    finally { this.stop(key); }
  }
}
