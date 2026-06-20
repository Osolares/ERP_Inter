import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="topbar">
      <div>
        <strong>ERP Intermotores v14</strong>
        <small>Configuración híbrida centralizada</small>
      </div>
      <button class="btn" type="button" (click)="theme.toggleTheme()">
        🌓 Cambiar tema
      </button>
    </header>
  `
})
export class TopbarComponent {
  theme = inject(ThemeService);
}
