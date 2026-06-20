import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-card">
      <h1>Ingresar</h1>
      <label>Correo</label>
      <input type="email" placeholder="admin@intermotores.com" />
      <label>Contraseña</label>
      <input type="password" />
      <button class="btn primary">Ingresar</button>
    </div>
  `
})
export class LoginComponent {}
