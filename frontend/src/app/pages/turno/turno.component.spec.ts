import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TurnoComponent } from './turno.component';
import { AuthService } from '../../core/services/auth.service';
import { TurnoCaja } from '../../core/models/pos.models';

describe('TurnoComponent UI & Role Rules', () => {
  let component: TurnoComponent;
  let fixture: ComponentFixture<TurnoComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockTurnoActivo: TurnoCaja = {
    id: 'turno-uuid-1',
    usuario_id: 3,
    almacen_id: 'alm-uuid-1',
    monto_inicial: 150.0,
    fecha_apertura: '2026-09-09T08:30:00Z',
    estado: 'abierto',
    almacen: {
      id: 'alm-uuid-1',
      nombre: 'Almacén Sucursal Centro',
      tipo: 'venta',
      activo: true,
    },
  };

  const mockTurnosGlobales: TurnoCaja[] = [
    mockTurnoActivo,
    {
      id: 'turno-uuid-2',
      usuario_id: 4,
      almacen_id: 'alm-uuid-2',
      monto_inicial: 200.0,
      fecha_apertura: '2026-09-09T09:00:00Z',
      estado: 'abierto',
      almacen: {
        id: 'alm-uuid-2',
        nombre: 'Almacén Norte',
        tipo: 'venta',
        activo: true,
      },
      usuario: {
        id: 4,
        name: 'Vendedor Dos',
        email: 'vendedor2@guadalupos.local',
      },
    },
  ];

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [TurnoComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
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

  it('Vendedor con turno activo: muestra tarjeta con datos de almacén, monto inicial y botón de cerrar turno', () => {
    authService.usuarioActual.set({
      id: 3,
      name: 'Vendedor Uno',
      email: 'vendedor1@guadalupos.local',
      roles: ['vendedor'],
    });

    fixture = TestBed.createComponent(TurnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const reqActivo = httpMock.expectOne('/api/turnos/activo');
    reqActivo.flush(mockTurnoActivo);
    fixture.detectChanges();

    // No debe pedir listado global porque no es admin/master
    httpMock.expectNone('/api/turnos?estado=abierto');

    expect(component.turnoPropio()).toEqual(mockTurnoActivo);
    const cardActivo = fixture.nativeElement.querySelector('.card-turno-activo');
    expect(cardActivo).not.toBeNull();
    expect(cardActivo.textContent).toContain('Almacén Sucursal Centro');
    expect(cardActivo.textContent).toContain('Bs 150.00');

    // Botón de cerrar propio turno
    const btnCerrar = fixture.nativeElement.querySelector('#btn-cerrar-mi-turno');
    expect(btnCerrar).not.toBeNull();
  });

  it('Vendedor sin turno activo: muestra mensaje informativo y enlace a /venta', () => {
    authService.usuarioActual.set({
      id: 3,
      name: 'Vendedor Uno',
      email: 'vendedor1@guadalupos.local',
      roles: ['vendedor'],
    });

    fixture = TestBed.createComponent(TurnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const reqActivo = httpMock.expectOne('/api/turnos/activo');
    reqActivo.flush(null);
    fixture.detectChanges();

    const cardSinTurno = fixture.nativeElement.querySelector('.card-sin-turno');
    expect(cardSinTurno).not.toBeNull();
    expect(cardSinTurno.textContent).toContain('No tienes un turno de caja abierto');

    const btnIrVenta = fixture.nativeElement.querySelector('#btn-ir-a-venta');
    expect(btnIrVenta).not.toBeNull();
    expect(btnIrVenta.getAttribute('href')).toBe('/venta');
  });

  it('Administrador / Master: ADEMÁS de su estado, muestra la tabla de turnos abiertos en el sistema', () => {
    authService.usuarioActual.set({
      id: 2,
      name: 'Admin General',
      email: 'admin@guadalupos.local',
      roles: ['administrador'],
    });

    fixture = TestBed.createComponent(TurnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Debe pedir turno propio Y turnos globales abiertos
    const reqActivo = httpMock.expectOne('/api/turnos/activo');
    reqActivo.flush(null);

    const reqGlobales = httpMock.expectOne('/api/turnos?estado=abierto');
    reqGlobales.flush(mockTurnosGlobales);
    fixture.detectChanges();

    expect(component.esAdminOMaster()).toBe(true);
    const seccionSupervision = fixture.nativeElement.querySelector('.seccion-supervision');
    expect(seccionSupervision).not.toBeNull();

    const filas = fixture.nativeElement.querySelectorAll('.data-table tbody tr');
    expect(filas.length).toBe(2);

    // Botón para cerrar turno de otro usuario en la fila 2
    const btnCerrarOtro = fixture.nativeElement.querySelector('#btn-cerrar-turno-turno-uuid-2');
    expect(btnCerrarOtro).not.toBeNull();
  });

  it('Cierre de turno: abre modal, envía monto contado y muestra resultado con indicador de diferencia', () => {
    authService.usuarioActual.set({
      id: 3,
      name: 'Vendedor Uno',
      email: 'vendedor1@guadalupos.local',
      roles: ['vendedor'],
    });

    fixture = TestBed.createComponent(TurnoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const reqActivo = httpMock.expectOne('/api/turnos/activo');
    reqActivo.flush(mockTurnoActivo);
    fixture.detectChanges();

    // Abrir modal de cierre
    component.abrirModalCerrar(mockTurnoActivo);
    fixture.detectChanges();

    expect(component.mostrandoModalCierre()).toBe(true);
    expect(component.turnoACerrar()).toEqual(mockTurnoActivo);

    // Ingresar monto contado
    component.montoContado = 160.0;
    component.confirmarCierre();

    const reqCerrar = httpMock.expectOne('/api/turnos/turno-uuid-1/cerrar');
    expect(reqCerrar.request.body).toEqual({ monto_final_contado: 160.0 });

    const mockCerrado: TurnoCaja = {
      ...mockTurnoActivo,
      estado: 'cerrado',
      monto_final_esperado: 150.0,
      monto_final_contado: 160.0,
      diferencia: 10.0,
    };
    reqCerrar.flush(mockCerrado);

    // Manejar recarga de turno activo
    const reqActivoPost = httpMock.expectOne('/api/turnos/activo');
    reqActivoPost.flush(null);
    fixture.detectChanges();

    expect(component.resultadoCierre()).toEqual(mockCerrado);
    expect(component.obtenerEstadoDiferencia(10.0)).toBe('sobrante');

    const difCard = fixture.nativeElement.querySelector('.diferencia-card');
    expect(difCard).not.toBeNull();
    expect(difCard.textContent).toContain('SOBRANTE');
    expect(difCard.textContent).toContain('Bs 10.00');
  });
});
