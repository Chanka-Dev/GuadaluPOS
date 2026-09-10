import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { VentaComponent } from './venta.component';
import { Producto, TurnoCaja } from '../../core/models/pos.models';
import { AuthService } from '../../core/services/auth.service';

describe('VentaComponent UI Interaction', () => {
  let component: VentaComponent;
  let fixture: ComponentFixture<VentaComponent>;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockTurno: TurnoCaja = {
    id: 'turno-test-1',
    usuario_id: 1,
    almacen_id: 'alm-test-1',
    monto_inicial: 100,
    fecha_apertura: '2026-09-08T10:00:00Z',
    estado: 'abierto',
    almacen: { id: 'alm-test-1', nombre: 'Almacén Central', tipo: 'venta', activo: true },
  };

  const mockProductos: Producto[] = [
    {
      id: 'prod-pack-1',
      nombre: 'Galletas Pack 12',
      unidades_por_paquete: 12,
      permite_venta_por_paquete: true,
      precio_venta: 2.50,
      activo: true,
    },
    {
      id: 'prod-unit-1',
      nombre: 'Agua Mineral 500ml',
      unidades_por_paquete: 1,
      permite_venta_por_paquete: false,
      precio_venta: 1.00,
      activo: true,
    },
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    authService.limpiarSesion();
    authService.usuarioActual.set({
      id: 2,
      name: 'Vendedor Test',
      email: 'vendedor@test.local',
      roles: ['vendedor'],
    });

    fixture = TestBed.createComponent(VentaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('Bloquea la pantalla de venta si no hay turno abierto mostrando formulario de apertura', () => {
    fixture.detectChanges(); // triggers ngOnInit

    // Mock peticiones iniciales: almacenes y turnoActivo
    const reqAlm = httpMock.expectOne('/api/almacenes');
    reqAlm.flush([{ id: 'alm-test-1', nombre: 'Almacén Central', tipo: 'venta', activo: true }]);

    const reqTurno = httpMock.expectOne('/api/turnos/activo');
    reqTurno.flush(null); // sin turno

    const reqTurnoAlm = httpMock.expectOne('/api/turnos/almacen/alm-test-1/activo');
    reqTurnoAlm.flush(null); // sin turno abierto en el almacén

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.turno-bloqueo-overlay')).not.toBeNull();
    expect(compiled.querySelector('.catalogo-section')).toBeNull();
    expect(component.turnoActivo()).toBeNull();
  });

  it('Detecta turno abierto en almacén y permite unirse a la caja compartida', () => {
    fixture.detectChanges();

    const reqAlm = httpMock.expectOne('/api/almacenes');
    reqAlm.flush([{ id: 'alm-test-1', nombre: 'Almacén Central', tipo: 'venta', activo: true }]);

    const reqTurno = httpMock.expectOne('/api/turnos/activo');
    reqTurno.flush(null);

    const reqTurnoAlm = httpMock.expectOne('/api/turnos/almacen/alm-test-1/activo');
    reqTurnoAlm.flush(mockTurno);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.caja-compartida-banner')).not.toBeNull();
    expect(component.turnoAlmacenAbierto()?.id).toBe(mockTurno.id);

    // Hacer click en unirse a la caja compartida
    component.unirseATurnoAbierto();
    const reqUnirse = httpMock.expectOne(`/api/turnos/${mockTurno.id}/unirse`);
    expect(reqUnirse.request.method).toBe('POST');
    reqUnirse.flush({ message: 'Te has unido al turno exitosamente', turno: mockTurno });

    const reqProds = httpMock.expectOne('/api/productos');
    reqProds.flush(mockProductos);

    fixture.detectChanges();
    expect(component.turnoActivo()).not.toBeNull();
    expect(compiled.querySelector('.turno-bloqueo-overlay')).toBeNull();
  });

  it('Muestra catálogo y carrito cuando el usuario tiene un turno activo', () => {
    fixture.detectChanges();

    const reqAlm = httpMock.expectOne('/api/almacenes');
    reqAlm.flush([{ id: 'alm-test-1', nombre: 'Almacén Central', tipo: 'venta', activo: true }]);

    const reqTurno = httpMock.expectOne('/api/turnos/activo');
    reqTurno.flush(mockTurno);

    const reqProds = httpMock.expectOne('/api/productos');
    reqProds.flush(mockProductos);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.turno-bloqueo-overlay')).toBeNull();
    expect(compiled.querySelector('.catalogo-section')).not.toBeNull();
    expect(compiled.querySelectorAll('.producto-card').length).toBe(2);
  });

  it('Al tocar producto con permite_venta_por_paquete abre el modal de selección de paquete/unidad', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(mockTurno);
    httpMock.expectOne('/api/productos').flush(mockProductos);
    fixture.detectChanges();

    const prodConPaquete = mockProductos[0];
    component.seleccionarProducto(prodConPaquete);
    fixture.detectChanges();

    expect(component.productoEnModal()).toEqual(prodConPaquete);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.modal-card h3')?.textContent).toContain('Galletas Pack 12');

    // Cambiar a paquete y añadir 2 paquetes
    component.modalUnidad.set('paquete');
    component.cambiarCantidadModal(1); // 1 + 1 = 2
    component.confirmarModalPaquete();
    fixture.detectChanges();

    expect(component.carrito().length).toBe(1);
    expect(component.carrito()[0].unidad).toBe('paquete');
    expect(component.carrito()[0].cantidad).toBe(2);
    // 2 paquetes * 12 unidades * $2.50 = $60.00
    expect(component.totalCarrito()).toBe(60.00);
  });

  it('Si el cobro falla con 422 (stock insuficiente), muestra el error en la UI y NO limpia el carrito', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(mockTurno);
    httpMock.expectOne('/api/productos').flush(mockProductos);
    fixture.detectChanges();

    // Agregar producto individual al carrito
    component.agregarAlCarrito(mockProductos[1], 5, 'unidad');
    expect(component.carrito().length).toBe(1);
    expect(component.totalCarrito()).toBe(5.00);

    // Intentar cobrar
    component.ejecutarCobro();

    const reqVenta = httpMock.expectOne('/api/ventas');
    expect(reqVenta.request.method).toBe('POST');
    expect(reqVenta.request.body.client_uuid).toBeDefined();

    // Responder con 422 stock insuficiente
    reqVenta.flush(
      { message: "Stock insuficiente para el producto 'Agua Mineral 500ml'. Faltaron 3 unidades." },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    fixture.detectChanges();

    // Comprobaciones críticas:
    // 1. Mensaje de error visible
    expect(component.errorVenta()).toBe("Stock insuficiente para el producto 'Agua Mineral 500ml'. Faltaron 3 unidades.");
    // 2. Carrito NO se pierde (el vendedor puede ajustar cantidades)
    expect(component.carrito().length).toBe(1);
    expect(component.carrito()[0].cantidad).toBe(5);
    expect(component.totalCarrito()).toBe(5.00);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notif-banner.error')?.textContent).toContain("Stock insuficiente");
  });

  it('Si el cobro responde 201, limpia el carrito y muestra confirmación visual clara', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(mockTurno);
    httpMock.expectOne('/api/productos').flush(mockProductos);
    fixture.detectChanges();

    component.agregarAlCarrito(mockProductos[1], 2, 'unidad');
    component.ejecutarCobro();

    const reqVenta = httpMock.expectOne('/api/ventas');
    reqVenta.flush({
      id: 'vnt-12345678-uuid',
      usuario_id: 1,
      almacen_id: 'alm-test-1',
      total: 2.00,
      client_uuid: reqVenta.request.body.client_uuid,
      created_at: new Date().toISOString(),
    }, { status: 201, statusText: 'Created' });

    fixture.detectChanges();

    // Comprobaciones:
    // 1. Carrito vacío
    expect(component.carrito().length).toBe(0);
    expect(component.totalCarrito()).toBe(0);
    // 2. Mensaje de éxito visible
    expect(component.mensajeExitoOnline()).toContain('Venta registrada por Bs 2.00');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notif-banner.exito')?.textContent).toContain('Venta registrada con éxito');
  });

  it('Si el cobro se hace sin red, muestra confirmación visual offline y no pierde la venta', async () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/almacenes').flush([]);
    httpMock.expectOne('/api/turnos/activo').flush(mockTurno);
    httpMock.expectOne('/api/productos').flush(mockProductos);
    fixture.detectChanges();

    component.agregarAlCarrito(mockProductos[1], 1, 'unidad');
    component.ejecutarCobro();

    const reqVenta = httpMock.expectOne('/api/ventas');
    reqVenta.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });

    // Esperar a que la promesa from(guardarVentaOffline) resuelva
    await new Promise(resolve => setTimeout(resolve, 150));
    fixture.detectChanges();

    // Carrito se limpia porque se guardó localmente
    expect(component.carrito().length).toBe(0);
    expect(component.mensajeExitoOffline()).toContain('guardada en la cola local');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.notif-banner.offline-banner')?.textContent).toContain('guardada localmente');
  });

  it('Rol privilegiado (master): permite modificar el precio unitario/paquete y seleccionar un lote específico', () => {
    authService.usuarioActual.set({
      id: 1,
      name: 'Master Test',
      email: 'master@test.local',
      roles: ['master'],
    });

    fixture.detectChanges();
    httpMock.expectOne('/api/almacenes').flush([{ id: 'alm-test-1', nombre: 'Almacén Central', tipo: 'venta', activo: true }]);
    httpMock.expectOne('/api/turnos/activo').flush(mockTurno);
    httpMock.expectOne('/api/productos').flush(mockProductos);
    const reqLotes = httpMock.expectOne('/api/lotes');
    reqLotes.flush([
      {
        id: 'lote-test-uuid',
        producto_id: 'prod-pack-1',
        proveedor_id: 'prov-1',
        almacen_id: 'alm-test-1',
        cantidad_paquetes: 10,
        cantidad_unidades: 120,
        precio_compra_unitario: 2.0,
        fecha_ingreso: '2026-09-01',
        fecha_vencimiento: '2027-01-01',
        estado: 'activo',
      },
    ]);
    fixture.detectChanges();

    expect(component.puedeModificarPrecio()).toBe(true);

    // Seleccionar producto con paquete
    component.seleccionarProducto(mockProductos[0]);
    fixture.detectChanges();

    expect(component.productoEnModal()).toEqual(mockProductos[0]);
    expect(component.lotesDisponiblesModal().length).toBe(1);

    // Personalizar precio y asignar lote
    component.modalUnidad.set('paquete');
    component.modalCantidad.set(5);
    component.modalPrecioPersonalizado.set(28.00); // en lugar de 30 (12 * 2.50)
    component.modalLoteSeleccionadoId.set('lote-test-uuid');

    component.confirmarModalPaquete();
    fixture.detectChanges();

    expect(component.carrito().length).toBe(1);
    expect(component.carrito()[0].precioUnitario).toBe(28.00);
    expect(component.carrito()[0].subtotal).toBe(140.00); // 5 * 28
    expect(component.carrito()[0].loteId).toBe('lote-test-uuid');

    // Cobrar
    component.ejecutarCobro();
    const reqVenta = httpMock.expectOne('/api/ventas');
    expect(reqVenta.request.body.items[0].precio).toBe(28.00);
    expect(reqVenta.request.body.items[0].lote_id).toBe('lote-test-uuid');
    reqVenta.flush({
      id: 'vnt-wholesale-uuid',
      usuario_id: 1,
      almacen_id: 'alm-test-1',
      total: 140.00,
      client_uuid: reqVenta.request.body.client_uuid,
      created_at: new Date().toISOString(),
    }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(component.carrito().length).toBe(0);
    expect(component.mensajeExitoOnline()).toContain('140.00');
  });
});
