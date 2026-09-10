import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sin-permiso',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="sin-permiso-container">
      <div class="sin-permiso-card">
        <div class="icon-circle">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
        </div>
        <h1>Acceso Denegado</h1>
        <p>No tienes los permisos necesarios ni el rol adecuado para acceder a esta sección del sistema.</p>
        <div class="actions">
          <a routerLink="/" class="btn-primary">Volver al Inicio</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sin-permiso-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .sin-permiso-card {
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 16px;
      padding: 40px;
      max-width: 460px;
      width: 100%;
      text-align: center;
      color: #f8fafc;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .icon-circle {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 1.6rem;
      font-weight: 700;
      color: #f87171;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .btn-primary {
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
  `]
})
export class SinPermisoComponent {}
