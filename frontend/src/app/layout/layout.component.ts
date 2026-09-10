import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <!-- Navbar Superior -->
      <header class="navbar">
        <div class="brand">
          <div class="logo-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <span class="brand-name">GuadaluPOS</span>
        </div>

        <!-- Enlaces en Desktop -->
        <nav class="nav-links desktop-only">
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

        <!-- Perfil en Desktop -->
        <div class="user-profile desktop-only">
          <div class="user-details">
            <span class="user-name">{{ authService.usuarioActual()?.name || 'Usuario' }}</span>
            <span class="user-role">{{ obtenerRolUsuario() }}</span>
          </div>
          <button (click)="onLogout()" class="btn-logout" title="Cerrar Sesión">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Salir</span>
          </button>
        </div>

        <!-- Acciones en Móvil -->
        <div class="mobile-actions mobile-only">
          <span class="user-role-badge-mob">{{ obtenerRolUsuario() }}</span>
          <button type="button" class="btn-hamburger" (click)="toggleMenuMovil()" aria-label="Abrir Menú">
            <svg *ngIf="!menuMovilAbierto()" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <svg *ngIf="menuMovilAbierto()" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      <!-- Menú Drawer Móvil Desplegable -->
      <div *ngIf="menuMovilAbierto()" class="mobile-drawer-backdrop" (click)="cerrarMenuMovil()">
        <div class="mobile-drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div class="drawer-user-info">
              <span class="drawer-user-name">{{ authService.usuarioActual()?.name || 'Usuario' }}</span>
              <span class="drawer-user-email">{{ authService.usuarioActual()?.email }}</span>
              <span class="drawer-role-tag">{{ obtenerRolUsuario() }}</span>
            </div>
            <button class="btn-close-drawer" (click)="cerrarMenuMovil()">✕</button>
          </div>

          <nav class="drawer-links">
            <a routerLink="/" (click)="cerrarMenuMovil()" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="drawer-item">
              <span class="drawer-icon">🏠</span>
              <span>Inicio / Dashboard</span>
            </a>
            <a routerLink="/venta" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-item">
              <span class="drawer-icon">🛒</span>
              <span>Punto de Venta (POS)</span>
            </a>
            <a routerLink="/ventas" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-item">
              <span class="drawer-icon">🧾</span>
              <span>Historial de Ventas</span>
            </a>
            @if (authService.tieneRol(['master', 'administrador', 'supervisor'])) {
              <a routerLink="/catalogo" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-item">
                <span class="drawer-icon">📦</span>
                <span>Catálogo y Lotes</span>
              </a>
            }
            @if (authService.tieneRol(['master', 'administrador'])) {
              <a routerLink="/usuarios" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-item">
                <span class="drawer-icon">👥</span>
                <span>Gestión de Usuarios</span>
              </a>
            }
            <a routerLink="/turno" (click)="cerrarMenuMovil()" routerLinkActive="active" class="drawer-item">
              <span class="drawer-icon">⏱️</span>
              <span>Turno y Arqueo de Caja</span>
            </a>
          </nav>

          <div class="drawer-footer">
            <button (click)="onLogout(); cerrarMenuMovil()" class="btn-logout-drawer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Contenido Principal -->
      <main class="main-container">
        <router-outlet></router-outlet>
      </main>

      <!-- Barra de Navegación Inferior en Móvil (Bottom Navigation Bar) -->
      <nav class="mobile-bottom-nav mobile-only">
        <a routerLink="/venta" routerLinkActive="active-tab" class="tab-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span>Vender</span>
        </a>
        <a routerLink="/ventas" routerLinkActive="active-tab" class="tab-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span>Historial</span>
        </a>
        <a routerLink="/turno" routerLinkActive="active-tab" class="tab-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M7 15h0M2 9.5h20"></path>
          </svg>
          <span>Turno</span>
        </a>
        <button type="button" class="tab-item btn-tab-menu" (click)="toggleMenuMovil()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <span>Menú</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      background-color: #090d16;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .navbar {
      height: 56px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo-box {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #2563eb, #10b981);
      border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;
    }
    .brand-name {
      font-size: 1.15rem; font-weight: 800;
      background: linear-gradient(135deg, #fff, #93c5fd);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; align-items: center; gap: 2px; }
    .nav-item {
      color: #94a3b8; text-decoration: none; font-size: 0.85rem; font-weight: 600;
      padding: 7px 12px; border-radius: 8px; transition: 0.2s;
    }
    .nav-item:hover { color: #f8fafc; background: rgba(255, 255, 255, 0.05); }
    .nav-item.active { color: #38bdf8; background: rgba(56, 189, 248, 0.12); }

    .user-profile { display: flex; align-items: center; gap: 14px; }
    .user-details { display: flex; flex-direction: column; align-items: flex-end; }
    .user-name { font-size: 0.84rem; font-weight: 700; color: #f8fafc; }
    .user-role {
      font-size: 0.65rem; font-weight: 800; color: #10b981;
      background: rgba(16, 185, 129, 0.15); padding: 1px 5px; border-radius: 4px;
    }
    .btn-logout {
      display: flex; align-items: center; gap: 5px;
      background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25);
      color: #fca5a5; padding: 6px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
    }

    .main-container {
      flex: 1; padding: 20px; max-width: 1400px; width: 100%; margin: 0 auto; box-sizing: border-box;
    }

    /* Reglas Desktop vs Móvil */
    .mobile-only { display: none !important; }
    .desktop-only { display: flex; }

    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: flex !important; }
      .main-container { padding: 10px 8px 75px 8px; }

      .mobile-actions { display: flex; align-items: center; gap: 8px; }
      .user-role-badge-mob {
        font-size: 0.65rem; font-weight: 800; color: #10b981;
        background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 3px 7px; border-radius: 6px;
      }
      .btn-hamburger {
        background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f8fafc; width: 36px; height: 36px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }

      /* Drawer Móvil */
      .mobile-drawer-backdrop {
        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px);
        z-index: 999; display: flex; justify-content: flex-end;
      }
      .mobile-drawer {
        width: 82%; max-width: 320px; height: 100%; background: #0f172a;
        border-left: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column;
        animation: slideIn 0.2s ease-out;
      }
      @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      .drawer-header {
        padding: 18px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex; justify-content: space-between; align-items: flex-start;
      }
      .drawer-user-info { display: flex; flex-direction: column; gap: 3px; }
      .drawer-user-name { font-size: 0.95rem; font-weight: 700; color: #fff; }
      .drawer-user-email { font-size: 0.75rem; color: #94a3b8; }
      .drawer-role-tag {
        font-size: 0.65rem; font-weight: 800; color: #38bdf8;
        background: rgba(56, 189, 248, 0.15); width: fit-content; padding: 2px 6px; border-radius: 4px; margin-top: 4px;
      }
      .btn-close-drawer { background: none; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer; }
      .drawer-links { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
      .drawer-item {
        display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px;
        color: #cbd5e1; text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: 0.15s;
      }
      .drawer-item:hover, .drawer-item.active { background: rgba(56, 189, 248, 0.12); color: #38bdf8; }
      .drawer-icon { font-size: 1.1rem; }
      .drawer-footer { padding: 14px 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
      .btn-logout-drawer {
        width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
        background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5; padding: 10px; border-radius: 10px; font-weight: 700; font-size: 0.88rem; cursor: pointer;
      }

      /* Barra Inferior Fija */
      .mobile-bottom-nav {
        position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
        background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(16px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex; justify-content: space-around; align-items: center;
        z-index: 100; padding: 0 4px;
      }
      .tab-item {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
        color: #94a3b8; text-decoration: none; font-size: 0.7rem; font-weight: 600; flex: 1; padding: 6px 0;
        background: transparent; border: none; cursor: pointer;
      }
      .tab-item svg { stroke: #94a3b8; transition: 0.15s; }
      .tab-item.active-tab, .tab-item:active { color: #38bdf8; }
      .tab-item.active-tab svg { stroke: #38bdf8; }
      .btn-tab-menu { color: #94a3b8; }
    }
  `]
})
export class LayoutComponent {
  readonly authService = inject(AuthService);
  menuMovilAbierto = signal<boolean>(false);

  toggleMenuMovil(): void {
    this.menuMovilAbierto.update(v => !v);
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

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
