import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UsuariosComponent } from './usuarios.component';
import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/models/auth.models';
import { environment } from '../../../environments/environment';

describe('UsuariosComponent Security & UI Rules', () => {
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockUsers: Usuario[] = [
    {
      id: 1,
      name: 'Usuario Master Principal',
      email: 'master@guadalupos.local',
      telefono: '70000001',
      activo: true,
      roles: [{ id: 1, name: 'master' }],
    },
    {
      id: 2,
      name: 'Admin Sucursal',
      email: 'admin@guadalupos.local',
      telefono: '70000002',
      activo: true,
      roles: [{ id: 2, name: 'administrador' }],
    },
    {
      id: 3,
      name: 'Cajero Vendedor',
      email: 'vendedor@guadalupos.local',
      telefono: '70000003',
      activo: true,
      roles: [{ id: 3, name: 'vendedor' }],
    },
  ];

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('REGLA 1: Si el usuario autenticado es administrador, la opción "master" NO aparece en rolesDisponibles', () => {
    // Simular usuario autenticado como administrador
    authService.usuarioActual.set({
      id: 2,
      name: 'Admin Test',
      email: 'admin@guadalupos.local',
      roles: ['administrador'],
    });

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush(mockUsers);
    fixture.detectChanges();

    expect(component.esMasterActual()).toBe(false);
    expect(component.rolesDisponibles()).not.toContain('master');
    expect(component.rolesDisponibles()).toEqual(['administrador', 'supervisor', 'vendedor']);

    // Al abrir el modal nuevo, el select no contiene la opción master
    component.abrirModalNuevo();
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#usr-rol');
    expect(select).toBeTruthy();
    const options = Array.from(select.options).map(o => o.value);
    expect(options).not.toContain('master');
  });

  it('REGLA 1 (Contraria): Si el usuario autenticado es master, la opción "master" SÍ aparece en rolesDisponibles', () => {
    // Simular usuario autenticado como master
    authService.usuarioActual.set({
      id: 1,
      name: 'Master Test',
      email: 'master@guadalupos.local',
      roles: ['master'],
    });

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush(mockUsers);
    fixture.detectChanges();

    expect(component.esMasterActual()).toBe(true);
    expect(component.rolesDisponibles()).toContain('master');
  });

  it('REGLA 2: La fila del usuario con rol "master" NO debe mostrar el botón de desactivar/eliminar', () => {
    authService.usuarioActual.set({
      id: 1,
      name: 'Master Test',
      email: 'master@guadalupos.local',
      roles: ['master'],
    });

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush(mockUsers);
    fixture.detectChanges();

    // Botón desactivar para usuario 1 (master): NO DEBE EXISTIR en el DOM
    const btnDesactivarMaster = fixture.nativeElement.querySelector('#btn-desactivar-1');
    expect(btnDesactivarMaster).toBeNull();

    // Botón desactivar para usuario 3 (vendedor): SÍ DEBE EXISTIR en el DOM
    const btnDesactivarVendedor = fixture.nativeElement.querySelector('#btn-desactivar-3');
    expect(btnDesactivarVendedor).not.toBeNull();
  });

  it('REGLA 2 (Edición): Si quien edita NO es master y abre para editar a un master, el formulario entra en modo solo lectura', () => {
    // Quien edita es administrador
    authService.usuarioActual.set({
      id: 2,
      name: 'Admin Test',
      email: 'admin@guadalupos.local',
      roles: ['administrador'],
    });

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush(mockUsers);
    fixture.detectChanges();

    const masterUser = mockUsers[0];
    component.abrirModalEditar(masterUser);
    fixture.detectChanges();

    expect(component.modoSoloLectura()).toBe(true);
    expect(component.formUsuario.disabled).toBe(true);

    // El botón de guardar no debe existir en modo solo lectura
    const btnGuardar = fixture.nativeElement.querySelector('#btn-guardar-usuario');
    expect(btnGuardar).toBeNull();
  });

  it('REGLA 3: Propaga y muestra el mensaje de error real del backend si ocurre un error HTTP', () => {
    authService.usuarioActual.set({
      id: 1,
      name: 'Master Test',
      email: 'master@guadalupos.local',
      roles: ['master'],
    });

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const req = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    req.flush(mockUsers);
    fixture.detectChanges();

    // Simular error 403 con mensaje de negocio
    component.manejarError({
      status: 403,
      error: { message: 'Solo un usuario con rol master puede realizar esta acción.' },
    });
    fixture.detectChanges();

    expect(component.errorMsg()).toBe('Solo un usuario con rol master puede realizar esta acción.');
    const alertaError = fixture.nativeElement.querySelector('.alerta-error');
    expect(alertaError.textContent).toContain('Solo un usuario con rol master puede realizar esta acción.');
  });
});
