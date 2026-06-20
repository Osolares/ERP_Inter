import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent],
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="app-main">
        <app-topbar />
        <section class="app-content"><ng-content /></section>
      </main>
    </div>
  `
})
export class ShellComponent {}
