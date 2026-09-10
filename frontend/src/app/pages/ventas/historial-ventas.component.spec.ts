import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { HistorialVentasComponent } from './historial-ventas.component';
import { AuthService } from '../../core/services/auth.service';
import { VentaResponse } from '../../core/models/pos.models';

describe('HistorialVentasComponent', () => {
  let component: HistorialVentasComponent;
  let fixture: ComponentFixture<HistorialVentasComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockVentas: VentaResponse[] = [
    {
      id: 'vnt-001-uuid',
      usuario_id: 1,
      almacen_id: 'alm-1',
      turno_id: 'trn-1',
      total: 100.0,
      metodo_pago: 'efectivo',
      vendida_en: '2026-09-10T10:00:00Z',
      created_at: '2026-09-10T10:00:00Z',
      usuario: { id: 1, name: 'Pedro Master', email: 'pedro@test.local' },
      detalles: [
        {
          id: 'det-1',
          venta_id: 'vnt-001-uuid',
          producto_id: 'prod-1',
          lote_id: 'lote-1',
          cantidad: 24, // 24 unidades
          unidad: 'paquete',
          precio_unitario: 4.166,
          subtotal: 100.0,
          lote: {
            id: 'lote-1',
            producto_id: 'prod-1',
            proveedor_id: 'prov-1',
            almacen_id: 'alm-1',
            cantidad_paquetes: 10,
            cantidad_unidades: 0,
            precio_compra_unitario: 3.0, // 24 * 3.0 = 72.0 costo
            fecha_ingreso: '2026-09-01',
            estado: 'activo'
          },
          producto: {
            id: 'prod-1',
            nombre: 'Paceña Pack',
            unidades_por_paquete: 12,
            permite_venta_por_paquete: true,
            precio_venta: 50,
            activo: true
          }
        }
      ]
    },
    {
      id: 'vnt-002-uuid',
      usuario_id: 2,
      almacen_id: 'alm-1',
      turno_id: 'trn-1',
      total: 250.0,
      metodo_pago: 'transferencia',
      vendida_en: '2026-09-10T11:00:00Z',
      created_at: '2026-09-10T11:00:00Z',
      usuario: { id: 2, name: 'Juan Hermano', email: 'juan@test.local' },
      detalles: [
        {
          id: 'det-2',
          venta_id: 'vnt-002-uuid',
          producto_id: 'prod-2',
          lote_id: 'lote-2',
          cantidad: 12, // 12 unidades
          unidad: 'paquete',
          precio_unitario: 20.833,
          subtotal: 250.0,
          lote: {
            id: 'lote-2',
            producto_id: 'prod-2',
            proveedor_id: 'prov-1',
            almacen_id: 'alm-1',
            cantidad_paquetes: 5,
            cantidad_unidades: 0,
            precio_compra_unitario: 15.0, // 12 * 15.0 = 180.0 costo
            fecha_ingreso: '2026-09-01',
            estado: 'activo'
          },
          producto: {
            id: 'prod-2',
            nombre: 'Huari Especial',
            unidades_por_paquete: 12,
            permite_venta_por_paquete: true,
            precio_venta: 250,
            activo: true
          }
        }
      ]
    }
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HistorialVentasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.limpiarSesion();
    authService.usuarioActual.set({
      id: 1,
      name: 'Pedro Master',
      email: 'pedro@test.local',
      roles: ['master'],
    });

    fixture = TestBed.createComponent(HistorialVentasComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('Carga ventas y calcula correctamente los KPIs financieros (Efectivo vs QR y Ganancia Neta)', () => {
    fixture.detectChanges();

    // 1. Petición almacenes
    const reqAlm = httpMock.expectOne('/api/almacenes');
    reqAlm.flush([{ id: 'alm-1', nombre: 'Almacén Central', tipo: 'venta', activo: true }]);

    // 2. Petición turno activo
    const reqTurno = httpMock.expectOne('/api/turnos/activo');
    reqTurno.flush({
      id: 'trn-1',
      usuario_id: 1,
      monto_inicial: 200,
      estado: 'abierto',
      almacen_id: 'alm-1',
      abierto_en: '2026-09-10T08:00:00Z'
    });

    // 3. Petición ventas con turno_id
    const reqVentas = httpMock.expectOne(req => req.url === '/api/ventas' && req.params.get('turno_id') === 'trn-1');
    reqVentas.flush(mockVentas);

    fixture.detectChanges();

    // Verificaciones de datos y KPIs
    expect(component.ventas().length).toBe(2);
    expect(component.kpiTotalMonto()).toBe(350.0);
    expect(component.kpiTotalEfectivo()).toBe(100.0);
    expect(component.kpiTotalTransferencia()).toBe(250.0);
    expect(component.kpiTotalTarjeta()).toBe(0);

    // Costo total = 72 + 180 = 252.0
    expect(component.kpiTotalCosto()).toBe(252.0);
    // Ganancia = 350 - 252 = 98.0
    expect(component.kpiTotalGanancia()).toBe(98.0);
    // Margen = (98 / 350) * 100 = 28%
    expect(component.kpiMargenPorcentaje()).toBe(28.0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.valor-efectivo')?.textContent).toContain('$100.00');
    expect(compiled.querySelector('.valor-qr')?.textContent).toContain('$250.00');
    expect(compiled.querySelector('.valor-costo')?.textContent).toContain('$252.00');
    expect(compiled.querySelector('.valor-ganancia')?.textContent).toContain('+$98.00');
  });

  it('Oculta métricas de costos y ganancias si el usuario es solo vendedor', () => {
    authService.usuarioActual.set({
      id: 2,
      name: 'Vendedor Operador',
      email: 'vendedor@test.local',
      roles: ['vendedor'],
    });

    fixture.detectChanges();

    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(null);

    const reqVentas = httpMock.expectOne(req => req.url === '/api/ventas');
    reqVentas.flush(mockVentas);

    fixture.detectChanges();

    expect(component.puedeVerGanancias()).toBe(false);
    expect(component.kpiTotalCosto()).toBe(0);
    expect(component.kpiTotalGanancia()).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.kpi-costo')).toBeNull();
    expect(compiled.querySelector('.kpi-ganancia')).toBeNull();
    expect(compiled.querySelector('.sub-ganancia')).toBeNull();
  });

  it('Permite abrir modal y corregir el método de pago de efectivo a transferencia/QR', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(null);

    // Como no hay turno, busca ventas de hoy
    const reqVentas = httpMock.expectOne(req => req.url === '/api/ventas');
    reqVentas.flush(mockVentas);

    fixture.detectChanges();

    // Abrir modal de corrección para venta 1 (originalmente efectivo)
    const venta1 = mockVentas[0];
    component.abrirModalEditarPago(venta1);
    fixture.detectChanges();

    expect(component.modalEditarPagoAbierto()).toBe(true);
    expect(component.ventaAEditar()?.id).toBe(venta1.id);
    expect(component.nuevoMetodoPago()).toBe('efectivo');

    // Cambiar a transferencia
    component.nuevoMetodoPago.set('transferencia');
    component.guardarNuevoMetodoPago();

    const reqPatch = httpMock.expectOne(`/api/ventas/${venta1.id}/metodo-pago`);
    expect(reqPatch.request.method).toBe('PATCH');
    expect(reqPatch.request.body).toEqual({ metodo_pago: 'transferencia' });

    // Responder exitosamente
    reqPatch.flush({
      message: 'Método de pago actualizado exitosamente.',
      venta: { ...venta1, metodo_pago: 'transferencia' }
    });

    fixture.detectChanges();

    expect(component.modalEditarPagoAbierto()).toBe(false);
    // Venta 1 ahora debe ser transferencia
    const v1Actualizada = component.ventas().find(v => v.id === venta1.id);
    expect(v1Actualizada?.metodo_pago).toBe('transferencia');

    // Ahora todo fue transferencia ($350) y $0 en efectivo
    expect(component.kpiTotalEfectivo()).toBe(0);
    expect(component.kpiTotalTransferencia()).toBe(350.0);
  });
});
