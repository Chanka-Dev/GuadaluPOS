import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="welcome-header">
        <h1>Bienvenido, {{ authService.usuarioActual()?.name }}</h1>
        <p class="role-desc">Sesión activa con privilegios de: <strong>{{ authService.usuarioActual()?.roles?.[0] }}</strong></p>
      </div>

      <div class="cards-grid">
        <div class="dashboard-card">
          <div class="card-icon pos">POS</div>
          <h3>Punto de Venta</h3>
          <p>Registro y facturación de ventas con rotación de inventario FEFO.</p>
          <a routerLink="/venta" class="card-link">Ir a Ventas →</a>
        </div>

        @if (authService.tieneRol(['master', 'administrador', 'supervisor'])) {
          <div class="dashboard-card">
            <div class="card-icon cat">CAT</div>
            <h3>Catálogo e Inventario</h3>
            <p>Gestión de productos, proveedores, almacenes y lotes.</p>
            <a routerLink="/catalogo" class="card-link">Gestionar Catálogo →</a>
          </div>
        }

        @if (authService.tieneRol(['master', 'administrador'])) {
          <div class="dashboard-card">
            <div class="card-icon usr">USR</div>
            <h3>Usuarios y Roles</h3>
            <p>Administración de personal y asignación de permisos.</p>
            <a routerLink="/usuarios" class="card-link">Administrar Usuarios →</a>
          </div>
        }

        <div class="dashboard-card">
          <div class="card-icon box">CAJA</div>
          <h3>Turno de Caja</h3>
          <p>Apertura, arqueo y cierre diario de turno de caja.</p>
          <a routerLink="/turno" class="card-link">Gestionar Turno →</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      font-family: inherit;
    }
    .welcome-header {
      margin-bottom: 32px;
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 6px;
    }
    .role-desc {
      color: #94a3b8;
      font-size: 1rem;
      margin: 0;
    }
    .role-desc strong {
      color: #38bdf8;
      text-transform: uppercase;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
    }
    .dashboard-card {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(10px);
      transition: all 0.25s ease;
    }
    .dashboard-card:hover {
      transform: translateY(-4px);
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.5);
    }
    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      margin-bottom: 16px;
      color: white;
    }
    .card-icon.pos { background: linear-gradient(135deg, #10b981, #059669); }
    .card-icon.cat { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .card-icon.usr { background: linear-gradient(135deg, #8b5cf6, #6d28d9); }
    .card-icon.box { background: linear-gradient(135deg, #f59e0b, #d97706); }

    h3 {
      margin: 0 0 8px;
      color: #f8fafc;
      font-size: 1.2rem;
    }
    p {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0 0 20px;
      flex: 1;
    }
    .card-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.88rem;
      display: inline-flex;
      align-items: center;
    }
    .card-link:hover {
      text-decoration: underline;
    }
  `]
})
export class InicioComponent {
  readonly authService = inject(AuthService);
}
