import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductoService } from '../../core/services/producto.service';
import { TurnoService } from '../../core/services/turno.service';
import { VentaService } from '../../core/services/venta.service';
import { SyncService } from '../../core/services/sync.service';
import { AuthService } from '../../core/services/auth.service';
import { LoteService } from '../../core/services/lote.service';
import { Producto, TurnoCaja, Almacen, VentaResponse, Lote } from '../../core/models/pos.models';

interface CartItem {
  producto: Producto;
  cantidad: number;
  unidad: 'unidad' | 'paquete';
  precioUnitario: number;
  subtotal: number;
  precioPersonalizado?: number;
  loteId?: string | null;
}

@Component({
  selector: 'app-venta',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './venta.component.html',
  styleUrls: ['./venta.component.css']
})
export class VentaComponent implements OnInit, OnDestroy {
  private productoService = inject(ProductoService);
  private turnoService = inject(TurnoService);
  private ventaService = inject(VentaService);
  private loteService = inject(LoteService);
  public authService = inject(AuthService);
  syncService = inject(SyncService);
  private fb = inject(FormBuilder);

  // Estados reactivos (Signals)
  cargandoInicial = signal<boolean>(true);
  cargandoProductos = signal<boolean>(false);
  turnoActivo = signal<TurnoCaja | null>(null);
  almacenes = signal<Almacen[]>([]);
  productos = signal<Producto[]>([]);
  lotes = signal<Lote[]>([]);

  // Carrito de compras
  carrito = signal<CartItem[]>([]);

  // Modales
  productoEnModal = signal<Producto | null>(null);
  modalUnidad = signal<'unidad' | 'paquete'>('unidad');
  modalCantidad = signal<number>(1);
  modalPrecioPersonalizado = signal<number | null>(null);
  modalLoteSeleccionadoId = signal<string>('');
  mostrandoModalCobro = signal<boolean>(false);
  mostrandoModalConflictos = signal<boolean>(false);
  metodoPago = signal<string>('efectivo');

  // Control de rol para modificación de precios
  puedeModificarPrecio = computed(() => this.authService.tieneRol(['master', 'administrador', 'supervisor']));

  lotesDisponiblesModal = computed(() => {
    const prod = this.productoEnModal();
    const turno = this.turnoActivo();
    if (!prod || !turno) return [];
    return this.lotes().filter(
      l => l.producto_id === prod.id && l.almacen_id === turno.almacen_id && (Number(l.total_unidades ?? 0) > 0 || Number(l.cantidad_unidades || 0) > 0 || Number(l.cantidad_paquetes || 0) > 0)
    );
  });

  // Procesos / Estados de guardado
  procesandoApertura = signal<boolean>(false);
  errorApertura = signal<string | null>(null);
  turnoAlmacenAbierto = signal<TurnoCaja | null>(null);

  procesandoCobro = signal<boolean>(false);
  errorVenta = signal<string | null>(null);
  mensajeExitoOnline = signal<string | null>(null);
  mensajeExitoOffline = signal<string | null>(null);

  // Estado de conexión del navegador
  estaOnline = signal<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);

  // Handler para desuscribir event listener online/offline
  private onlineListener = () => {
    this.estaOnline.set(true);
    // Disparador 1: Evento 'online' del navegador
    this.syncService.sincronizarPendientes();
  };

  private offlineListener = () => {
    this.estaOnline.set(false);
  };

  // Formulario reactivo para apertura de turno
  abrirTurnoForm = this.fb.group({
    almacen_id: ['', [Validators.required]],
    monto_inicial: [0, [Validators.required, Validators.min(0)]],
  });

  // Computados para el carrito
  totalItems = computed(() => {
    return this.carrito().reduce((sum, item) => sum + item.cantidad, 0);
  });

  totalCarrito = computed(() => {
    return this.carrito().reduce((sum, item) => sum + item.subtotal, 0);
  });

  ngOnInit(): void {
    // Escuchar eventos online y offline del navegador
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }

    this.cargarDatosIniciales();

    // Disparador 2: Al inicializar el componente de venta, UNA sola vez, si hay ventas pendientes
    this.syncService.actualizarConteos().then(() => {
      if (this.syncService.conteoPendientes() > 0 && this.estaOnline()) {
        this.syncService.sincronizarPendientes();
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineListener);
      window.removeEventListener('offline', this.offlineListener);
    }
  }

  formatMoneda(valor: number | string | null | undefined): string {
    const num = Number(valor || 0);
    return `Bs ${num.toFixed(2)}`;
  }

  formatPrecioPaquete(producto: Producto | null): string {
    if (!producto) return 'Bs 0.00';
    if (producto.precio_venta_paquete !== null && producto.precio_venta_paquete !== undefined) {
      return `Bs ${Number(producto.precio_venta_paquete).toFixed(2)}`;
    }
    const total = Number(producto.precio_venta) * Number(producto.unidades_por_paquete || 1);
    return `Bs ${total.toFixed(2)}`;
  }

  obtenerPrecioBase(producto: Producto, unidad: 'unidad' | 'paquete'): number {
    if (unidad === 'paquete') {
      if (producto.precio_venta_paquete !== null && producto.precio_venta_paquete !== undefined) {
        return Number(producto.precio_venta_paquete);
      }
      return Number(producto.precio_venta) * (producto.unidades_por_paquete || 1);
    }
    return Number(producto.precio_venta);
  }

  obtenerNombreProducto(productoId: string): string {
    const p = this.productos().find(item => item.id === productoId);
    return p ? p.nombre : `Producto ${productoId.substring(0, 8)}`;
  }

  cargarDatosIniciales(): void {
    this.cargandoInicial.set(true);

    // 1. Cargar almacenes para el formulario de apertura
    this.turnoService.listarAlmacenes().subscribe({
      next: (alms) => {
        const activos = alms.filter(a => a.activo);
        this.almacenes.set(activos);
        if (activos.length > 0 && !this.abrirTurnoForm.get('almacen_id')?.value) {
          const primerAlm = activos[0].id;
          this.abrirTurnoForm.patchValue({ almacen_id: primerAlm }, { emitEvent: false });
          if (!this.cargandoInicial() && !this.turnoActivo()) {
            this.verificarCajaAbiertaAlmacen(primerAlm);
          }
        }
      },
      error: () => {}
    });

    this.abrirTurnoForm.get('almacen_id')?.valueChanges.subscribe((almId) => {
      if (almId && !this.cargandoInicial() && !this.turnoActivo()) {
        this.verificarCajaAbiertaAlmacen(almId);
      }
    });

    // Cargar lotes para selector de lote opcional (solo roles autorizados a venta mayorista)
    if (this.puedeModificarPrecio()) {
      this.loteService.listar().subscribe({
        next: (lotes) => this.lotes.set(lotes),
        error: () => {}
      });
    }

    // 2. Comprobar turno activo del usuario
    this.turnoService.turnoActivo().subscribe({
      next: (turno) => {
        this.turnoActivo.set(turno);
        this.cargandoInicial.set(false);
        if (turno) {
          this.cargarProductos();
        } else {
          const almId = this.abrirTurnoForm.get('almacen_id')?.value;
          if (almId) {
            this.verificarCajaAbiertaAlmacen(almId);
          }
        }
      },
      error: () => {
        this.turnoActivo.set(null);
        this.cargandoInicial.set(false);
        const almId = this.abrirTurnoForm.get('almacen_id')?.value;
        if (almId) {
          this.verificarCajaAbiertaAlmacen(almId);
        }
      }
    });
  }

  cargarProductos(): void {
    this.cargandoProductos.set(true);
    this.productoService.listar().subscribe({
      next: (prods) => {
        this.productos.set(prods);
        this.cargandoProductos.set(false);
      },
      error: () => {
        this.cargandoProductos.set(false);
        this.errorVenta.set('Error al cargar catálogo de productos (sin conexión y sin caché disponible).');
      }
    });
  }

  abrirTurno(): void {
    if (this.abrirTurnoForm.invalid) return;

    this.procesandoApertura.set(true);
    this.errorApertura.set(null);

    const val = this.abrirTurnoForm.value;
    const monto = Number(val.monto_inicial || 0);
    const almacenId = val.almacen_id || undefined;

    this.turnoService.abrir(monto, almacenId).subscribe({
      next: (nuevoTurno) => {
        this.turnoActivo.set(nuevoTurno);
        this.procesandoApertura.set(false);
        this.cargarProductos();
      },
      error: (err) => {
        this.procesandoApertura.set(false);
        const msg = err.error?.message || 'No se pudo abrir el turno de caja.';
        this.errorApertura.set(msg);
      }
    });
  }

  verificarCajaAbiertaAlmacen(almacenId: string): void {
    this.turnoService.consultarTurnoAlmacen(almacenId).subscribe({
      next: (t) => this.turnoAlmacenAbierto.set(t),
      error: () => this.turnoAlmacenAbierto.set(null),
    });
  }

  unirseATurnoAbierto(): void {
    const turno = this.turnoAlmacenAbierto();
    if (!turno) return;

    this.procesandoApertura.set(true);
    this.errorApertura.set(null);

    this.turnoService.unirse(turno.id).subscribe({
      next: (t) => {
        this.turnoActivo.set(t);
        this.procesandoApertura.set(false);
        this.cargarProductos();
      },
      error: (err) => {
        this.procesandoApertura.set(false);
        this.errorApertura.set(err.error?.message || 'No se pudo unir al turno de caja abierto.');
      }
    });
  }

  seleccionarProducto(producto: Producto): void {
    this.errorVenta.set(null);
    this.mensajeExitoOnline.set(null);
    this.mensajeExitoOffline.set(null);

    const defaultUnidad: 'unidad' | 'paquete' = producto.permite_venta_por_paquete ? 'paquete' : 'unidad';
    const precioBase = this.obtenerPrecioBase(producto, defaultUnidad);

    // Si tiene permiso para modificar precio o el producto permite venta por paquete, abrir modal
    if (this.puedeModificarPrecio() || producto.permite_venta_por_paquete) {
      this.productoEnModal.set(producto);
      this.modalUnidad.set(defaultUnidad);
      this.modalCantidad.set(1);
      this.modalPrecioPersonalizado.set(Number(precioBase.toFixed(2)));
      this.modalLoteSeleccionadoId.set('');
    } else {
      this.agregarAlCarrito(producto, 1, 'unidad');
    }
  }

  cerrarModalPaquete(): void {
    this.productoEnModal.set(null);
  }

  cambiarUnidadModal(unidad: 'unidad' | 'paquete'): void {
    this.modalUnidad.set(unidad);
    const prod = this.productoEnModal();
    if (prod) {
      const precioBase = this.obtenerPrecioBase(prod, unidad);
      this.modalPrecioPersonalizado.set(Number(precioBase.toFixed(2)));
    }
  }

  cambiarCantidadModal(delta: number): void {
    const actual = this.modalCantidad();
    if (actual + delta >= 1) {
      this.modalCantidad.set(actual + delta);
    }
  }

  actualizarCantidadModal(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    if (!isNaN(val) && val >= 1) {
      this.modalCantidad.set(val);
    }
  }

  validarCantidadModalBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) {
      this.modalCantidad.set(1);
      input.value = '1';
    } else {
      this.modalCantidad.set(val);
      input.value = String(val);
    }
  }

  actualizarPrecioModal(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.modalPrecioPersonalizado.set(isNaN(val) ? null : val);
  }

  confirmarModalPaquete(): void {
    const prod = this.productoEnModal();
    if (!prod) return;

    const unidad = this.modalUnidad();
    const cant = this.modalCantidad();
    const precioBase = this.obtenerPrecioBase(prod, unidad);

    let precioFinal = precioBase;
    if (this.puedeModificarPrecio()) {
      precioFinal = Number(this.modalPrecioPersonalizado() || precioBase);
    }

    const loteId = this.puedeModificarPrecio() && this.modalLoteSeleccionadoId()
      ? this.modalLoteSeleccionadoId()
      : null;

    this.agregarAlCarrito(prod, cant, unidad, precioFinal, loteId);
    this.cerrarModalPaquete();
  }

  agregarAlCarrito(
    producto: Producto,
    cantidad: number,
    unidad: 'unidad' | 'paquete',
    precioPersonalizado?: number,
    loteId?: string | null
  ): void {
    const precioBase = this.obtenerPrecioBase(producto, unidad);
    const precioEfectivo = (this.puedeModificarPrecio() && precioPersonalizado !== undefined)
      ? precioPersonalizado
      : precioBase;

    const actual = [...this.carrito()];
    const itemIndex = actual.findIndex(
      i => i.producto.id === producto.id && i.unidad === unidad && i.precioUnitario === precioEfectivo && i.loteId === loteId
    );

    if (itemIndex > -1) {
      const itemExistente = actual[itemIndex];
      const nuevaCantidad = itemExistente.cantidad + cantidad;
      actual[itemIndex] = {
        ...itemExistente,
        cantidad: nuevaCantidad,
        subtotal: +(nuevaCantidad * precioEfectivo).toFixed(2),
      };
    } else {
      actual.push({
        producto,
        cantidad,
        unidad,
        precioUnitario: +precioEfectivo.toFixed(2),
        subtotal: +(cantidad * precioEfectivo).toFixed(2),
        precioPersonalizado: Math.abs(precioEfectivo - precioBase) > 0.001 ? precioEfectivo : undefined,
        loteId: loteId || null,
      });
    }

    this.carrito.set(actual);
  }

  limpiarCarrito(): void {
    this.carrito.set([]);
    this.errorVenta.set(null);
  }

  toggleExpandirCarrito(): void {
    if (this.carrito().length > 0) {
      this.abrirModalCobro();
    }
  }

  abrirModalCobro(): void {
    if (this.carrito().length === 0) return;
    this.errorVenta.set(null);
    this.mostrandoModalCobro.set(true);
  }

  cerrarModalCobro(): void {
    this.mostrandoModalCobro.set(false);
  }

  abrirModalConflictos(): void {
    this.mostrandoModalConflictos.set(true);
  }

  cerrarModalConflictos(): void {
    this.mostrandoModalConflictos.set(false);
  }

  ejecutarCobro(): void {
    if (this.carrito().length === 0 || this.procesandoCobro()) return;

    const turno = this.turnoActivo();
    if (!turno) {
      this.errorVenta.set('No hay un turno de caja activo.');
      return;
    }

    this.procesandoCobro.set(true);
    this.errorVenta.set(null);
    this.mensajeExitoOnline.set(null);
    this.mensajeExitoOffline.set(null);

    const subtotalTotal = this.totalCarrito();

    const payload = {
      almacen_id: turno.almacen_id,
      turno_id: turno.id,
      metodo_pago: this.metodoPago(),
      vendida_en: new Date().toISOString(),
      items: this.carrito().map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precio: item.precioPersonalizado !== undefined ? item.precioPersonalizado : undefined,
        lote_id: item.loteId || undefined,
      })),
    };

    this.ventaService.registrar(payload).subscribe({
      next: (resp: VentaResponse) => {
        this.procesandoCobro.set(false);
        this.mostrandoModalCobro.set(false);

        // Limpiar carrito
        this.carrito.set([]);

        if (resp.offline) {
          // Confirmación visual distintiva de venta offline (reloj / pendiente)
          this.mensajeExitoOffline.set(
            `Venta de Bs ${subtotalTotal.toFixed(2)} guardada en la cola local (${payload.items.length} productos). Se sincronizará automáticamente al restablecerse la conexión.`
          );
        } else {
          // Confirmación visual de éxito online
          this.mensajeExitoOnline.set(
            `Venta registrada por Bs ${(+resp.total).toFixed(2)} (${payload.items.length} productos). Código: ${resp.id.substring(0, 8)}`
          );
        }
      },
      error: (err) => {
        this.procesandoCobro.set(false);
        // Si responde 422 por stock insuficiente u otro error, NO limpiar el carrito
        const msg = err.error?.message || 'Error al procesar la venta. Verifique el stock disponible.';
        this.errorVenta.set(msg);
      }
    });
  }
}
