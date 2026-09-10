import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ProductoService } from './services/producto.service';
import { TurnoService } from './services/turno.service';
import { VentaService } from './services/venta.service';
import { SyncService } from './services/sync.service';
import { DbService } from './services/db.service';
import { Producto, TurnoCaja, VentaResponse } from './models/pos.models';

describe('GuadaluPOS Servicios de Venta, Catálogo, Turno y Offline Sync', () => {
  let productoService: ProductoService;
  let turnoService: TurnoService;
  let ventaService: VentaService;
  let syncService: SyncService;
  let dbService: DbService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DbService,
        SyncService,
        ProductoService,
        TurnoService,
        VentaService,
      ],
    });

    productoService = TestBed.inject(ProductoService);
    turnoService = TestBed.inject(TurnoService);
    ventaService = TestBed.inject(VentaService);
    syncService = TestBed.inject(SyncService);
    dbService = TestBed.inject(DbService);
    httpMock = TestBed.inject(HttpTestingController);

    // Limpiar tablas IndexedDB de prueba
    await dbService.productos_cache.clear();
    await dbService.ventas_pendientes.clear();
  });

  afterEach(async () => {
    httpMock.verify();
    await dbService.productos_cache.clear();
    await dbService.ventas_pendientes.clear();
    TestBed.resetTestingModule();
  });

  it('ProductoService.listar() guarda en cache IndexedDB tras respuesta exitosa', async () => {
    const mockProductos: Producto[] = [
      {
        id: 'prod-uuid-1',
        nombre: 'Aceite 1L',
        unidades_por_paquete: 10,
        permite_venta_por_paquete: true,
        precio_venta: 12.00,
        activo: true,
      },
    ];

    productoService.listar().subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].nombre).toBe('Aceite 1L');
    });

    const req = httpMock.expectOne('/api/productos');
    expect(req.request.method).toBe('GET');
    req.flush(mockProductos);

    // Dar tiempo para fire-and-forget
    await new Promise(resolve => setTimeout(resolve, 50));
    const cached = await dbService.productos_cache.toArray();
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe('prod-uuid-1');
  });

  it('ProductoService.listar() recurre a cache IndexedDB si el GET falla por red', async () => {
    const mockCached: Producto = {
      id: 'prod-offline-1',
      nombre: 'Arroz 1kg Offline',
      unidades_por_paquete: 1,
      permite_venta_por_paquete: false,
      precio_venta: 5.00,
      activo: true,
    };

    await dbService.productos_cache.put(mockCached);

    productoService.listar().subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].nombre).toBe('Arroz 1kg Offline');
    });

    const req = httpMock.expectOne('/api/productos');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network Error' });
  });

  it('VentaService.registrar() encola en ventas_pendientes si falla por RED', async () => {
    const datos = {
      almacen_id: 'alm-uuid-1',
      turno_id: 'turno-uuid-1',
      metodo_pago: 'efectivo',
      vendida_en: new Date().toISOString(),
      items: [
        { producto_id: 'prod-uuid-1', cantidad: 1, unidad: 'unidad' as const },
      ],
    };

    const registrarPromise = firstValueFrom(ventaService.registrar(datos));

    const req = httpMock.expectOne('/api/ventas');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    const resp = await registrarPromise;
    expect(resp.offline).toBe(true);
    expect(resp.client_uuid).toBeDefined();

    const pendientes = await dbService.ventas_pendientes.toArray();
    expect(pendientes.length).toBe(1);
    expect(pendientes[0].estado).toBe('pendiente');
    expect(pendientes[0].client_uuid).toBe(resp.client_uuid);
  });

  it('VentaService.registrar() NO guarda offline si el backend responde 422 (stock insuficiente)', async () => {
    const datos = {
      almacen_id: 'alm-uuid-1',
      turno_id: 'turno-uuid-1',
      metodo_pago: 'efectivo',
      vendida_en: new Date().toISOString(),
      items: [
        { producto_id: 'prod-uuid-1', cantidad: 999, unidad: 'unidad' as const },
      ],
    };

    let errorCapturado: any = null;
    ventaService.registrar(datos).subscribe({
      next: () => {},
      error: (err) => {
        errorCapturado = err;
      }
    });

    const req = httpMock.expectOne('/api/ventas');
    req.flush(
      { message: 'Stock insuficiente para el producto' },
      { status: 422, statusText: 'Unprocessable Content' }
    );

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(errorCapturado).not.toBeNull();
    expect(errorCapturado.status).toBe(422);

    const pendientes = await dbService.ventas_pendientes.toArray();
    expect(pendientes.length).toBe(0); // NO se guarda offline
  });

  it('SyncService.sincronizarPendientes() pasa a estado conflicto si el backend responde 422 al sincronizar', async () => {
    await syncService.encolarVentaPendiente({
      almacen_id: 'alm-uuid-1',
      turno_id: 'turno-uuid-1',
      metodo_pago: 'efectivo',
      client_uuid: 'uuid-conflicto-test-1234',
      vendida_en: new Date().toISOString(),
      items: [
        { producto_id: 'prod-uuid-1', cantidad: 10, unidad: 'unidad' },
      ],
    });

    expect(syncService.conteoPendientes()).toBe(1);

    const syncPromise = syncService.sincronizarPendientes();

    // Permitir que la promesa de lectura de Dexie se complete y se emita el HTTP POST
    await new Promise(resolve => setTimeout(resolve, 50));

    const req = httpMock.expectOne('/api/ventas');
    expect(req.request.body.client_uuid).toBe('uuid-conflicto-test-1234');
    req.flush(
      { message: 'Stock insuficiente al sincronizar lote' },
      { status: 422, statusText: 'Unprocessable Content' }
    );

    await syncPromise;

    const fila = await dbService.ventas_pendientes.get('uuid-conflicto-test-1234');
    expect(fila?.estado).toBe('conflicto');
    expect(fila?.mensaje_error).toContain('Stock insuficiente al sincronizar lote');
    expect(syncService.conteoConflictos()).toBe(1);
    expect(syncService.conteoPendientes()).toBe(0);
  });
});
