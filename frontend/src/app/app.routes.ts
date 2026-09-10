import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login/login.component';
import { SinPermisoComponent } from './pages/sin-permiso/sin-permiso.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { VentaComponent } from './pages/venta/venta.component';
import { CatalogoComponent } from './pages/catalogo/catalogo.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { TurnoComponent } from './pages/turno/turno.component';
import { HistorialVentasComponent } from './pages/ventas/historial-ventas.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'sin-permiso',
    component: SinPermisoComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: InicioComponent,
      },
      {
        path: 'venta',
        component: VentaComponent,
      },
      {
        path: 'ventas',
        component: HistorialVentasComponent,
      },
      {
        path: 'catalogo',
        component: CatalogoComponent,
        canActivate: [rolGuard],
        data: { roles: ['master', 'administrador', 'supervisor'] },
      },
      {
        path: 'usuarios',
        component: UsuariosComponent,
        canActivate: [rolGuard],
        data: { roles: ['master', 'administrador'] },
      },
      {
        path: 'turno',
        component: TurnoComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
