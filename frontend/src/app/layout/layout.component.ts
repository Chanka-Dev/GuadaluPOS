import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="navbar">
        <div class="brand">
          <div class="logo-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span class="brand-name">GuadaluPOS</span>
        </div>

        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            Inicio
          </a>
          <a routerLink="/venta" routerLinkActive="active" class="nav-item">
            Punto de Venta
          </a>
          <a routerLink="/ventas" routerLinkActive="active" class="nav-item">
            Historial Ventas
          </a>
          @if (authService.tieneRol(['master', 'administrador', 'supervisor'])) {
            <a routerLink="/catalogo" routerLinkActive="active" class="nav-item">
              Catálogo
            </a>
          }
          @if (authService.tieneRol(['master', 'administrador'])) {
            <a routerLink="/usuarios" routerLinkActive="active" class="nav-item">
              Usuarios
            </a>
          }
          <a routerLink="/turno" routerLinkActive="active" class="nav-item">
            Turno Caja
          </a>
        </nav>

        <div class="user-profile">
          <div class="user-details">
            <span class="user-name">{{ authService.usuarioActual()?.name || 'Usuario' }}</span>
            <span class="user-role">{{ obtenerRolUsuario() }}</span>
          </div>
          <button (click)="onLogout()" class="btn-logout" title="Cerrar Sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main class="main-container">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      background-color: #090d16;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .navbar {
      height: 64px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
    }
    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .nav-item {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .nav-item:hover {
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.05);
    }
    .nav-item.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .user-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: #f8fafc;
    }
    .user-role {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 2px;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #fca5a5;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ffffff;
      border-color: #ef4444;
    }

    .main-container {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
    }
  `]
})
export class LayoutComponent {
  readonly authService = inject(AuthService);

  obtenerRolUsuario(): string {
    const user = this.authService.usuarioActual();
    if (!user || !user.roles || user.roles.length === 0) return 'VENDEDOR';
    const r = user.roles[0];
    const nombre = typeof r === 'string' ? r : (r as any).name;
    return (nombre || 'vendedor').toUpperCase();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
