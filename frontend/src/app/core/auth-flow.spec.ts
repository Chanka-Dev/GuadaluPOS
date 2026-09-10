import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './services/auth.service';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';
import { routes } from '../app.routes';
import { LoginResponse, Usuario } from './models/auth.models';

describe('GuadaluPOS Flujo de Autenticación y Guards', () => {
  let authService: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockMasterUser: Usuario = {
    id: 1,
    name: 'Usuario Master',
    email: 'master@guadalupos.local',
    roles: ['master'],
  };

  const mockVendedorUser: Usuario = {
    id: 2,
    name: 'Cajero Vendedor',
    email: 'vendedor@guadalupos.local',
    roles: ['vendedor'],
  };

  const mockLoginResponse: LoginResponse = {
    token: 'test-sanctum-token-12345',
    user: mockMasterUser,
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    });

    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('1. Login guarda el token y el usuario en localStorage y actualiza el signal usuarioActual', () => {
    authService.login('master@guadalupos.local', 'cambiar123').subscribe((res) => {
      expect(res.token).toBe('test-sanctum-token-12345');
      expect(res.user.roles).toContain('master');
    });

    const req = httpMock.expectOne('/api/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockLoginResponse);

    // Verificar persistencia en localStorage
    expect(localStorage.getItem('guadalupos_auth_token')).toBe('test-sanctum-token-12345');
    expect(localStorage.getItem('guadalupos_auth_user')).toContain('master@guadalupos.local');

    // Verificar signal usuarioActual
    expect(authService.usuarioActual()?.email).toBe('master@guadalupos.local');
    expect(authService.usuarioActual()?.roles).toContain('master');
    expect(authService.estaAutenticado()).toBe(true);
  });

  it('2. authGuard redirige a /login si no hay sesión activa', () => {
    authService.limpiarSesion();
    expect(authService.estaAutenticado()).toBe(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).not.toBe(true);
    // Debe retornar un UrlTree hacia /login
    expect((result as any).toString()).toBe('/login');
  });

  it('3. authGuard permite acceso si el usuario está autenticado', () => {
    localStorage.setItem('guadalupos_auth_token', 'token-valido');
    localStorage.setItem('guadalupos_auth_user', JSON.stringify(mockMasterUser));
    authService.usuarioActual.set(mockMasterUser);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('4. Usuario con rol master puede acceder a /usuarios (rolGuard retorna true)', () => {
    authService.usuarioActual.set(mockMasterUser);
    expect(authService.tieneRol(['master', 'administrador'])).toBe(true);

    const mockRouteSnapshot = {
      data: { roles: ['master', 'administrador'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => rolGuard(mockRouteSnapshot, {} as any));
    expect(result).toBe(true);
  });

  it('5. Usuario con rol vendedor NO puede acceder a /usuarios y es redirigido a /sin-permiso', () => {
    authService.usuarioActual.set(mockVendedorUser);
    expect(authService.tieneRol(['master', 'administrador'])).toBe(false);

    const mockRouteSnapshot = {
      data: { roles: ['master', 'administrador'] },
    } as unknown as ActivatedRouteSnapshot;

    const result = TestBed.runInInjectionContext(() => rolGuard(mockRouteSnapshot, {} as any));
    expect(result).not.toBe(true);
    expect((result as any).toString()).toBe('/sin-permiso');
  });

  it('6. Logout revoca token en backend, limpia localStorage y resetea estado', () => {
    localStorage.setItem('guadalupos_auth_token', 'token-para-cerrar');
    localStorage.setItem('guadalupos_auth_user', JSON.stringify(mockMasterUser));
    authService.usuarioActual.set(mockMasterUser);

    authService.logout();

    const req = httpMock.expectOne('/api/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Sesión cerrada' });

    expect(localStorage.getItem('guadalupos_auth_token')).toBeNull();
    expect(localStorage.getItem('guadalupos_auth_user')).toBeNull();
    expect(authService.usuarioActual()).toBeNull();
    expect(authService.estaAutenticado()).toBe(false);
  });
});
