import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  current = signal<'light' | 'dark'>((localStorage.getItem('theme') as 'light' | 'dark') || 'light');

  constructor() { this.applyTheme(this.current()); }

  toggleTheme(): void {
    const next = this.current() === 'light' ? 'dark' : 'light';
    this.current.set(next);
    localStorage.setItem('theme', next);
    this.applyTheme(next);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
