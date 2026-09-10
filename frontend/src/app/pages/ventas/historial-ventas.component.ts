import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VentaService } from '../../core/services/venta.service';
import { TurnoService } from '../../core/services/turno.service';
import { AlmacenService } from '../../core/services/almacen.service';
import { AuthService } from '../../core/services/auth.service';
import { VentaResponse, TurnoCaja, Almacen, VentaFiltros } from '../../core/models/pos.models';

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historial-ventas.component.html',
  styleUrls: ['./historial-ventas.component.css']
})
export class HistorialVentasComponent implements OnInit {
  private ventaService = inject(VentaService);
  private turnoService = inject(TurnoService);
  private almacenService = inject(AlmacenService);
  readonly authService = inject(AuthService);

  // Estados de datos
  ventas = signal<VentaResponse[]>([]);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  almacenes = signal<Almacen[]>([]);
  turnoActivo = signal<TurnoCaja | null>(null);

  // Filtros
  filtroAlcance = signal<'turno_actual' | 'hoy' | 'todos'>('turno_actual');
  filtroMetodoPago = signal<string>('');
  filtroAlmacenId = signal<string>('');
  terminoBusqueda = signal<string>('');

  // Modal Detalle
  ventaSeleccionada = signal<VentaResponse | null>(null);
  modalDetalleAbierto = signal<boolean>(false);

  // Modal Edición de Método de Pago
  ventaAEditar = signal<VentaResponse | null>(null);
  modalEditarPagoAbierto = signal<boolean>(false);
  nuevoMetodoPago = signal<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');
  guardandoPago = signal<boolean>(false);
  errorModalPago = signal<string | null>(null);

  // KPIs y ventas filtradas por término de búsqueda
  ventasFiltradas = computed(() => {
    const lista = this.ventas();
    const query = this.terminoBusqueda().trim().toLowerCase();
    if (!query) return lista;

    return lista.filter(v => {
      const idMatch = v.id.toLowerCase().includes(query) || (v.client_uuid && v.client_uuid.toLowerCase().includes(query));
      const usuarioMatch = v.usuario?.name?.toLowerCase().includes(query) || false;
      const almacenMatch = v.almacen?.nombre?.toLowerCase().includes(query) || false;
      const metodoMatch = v.metodo_pago?.toLowerCase().includes(query) || false;
      const detalleMatch = v.detalles?.some(d => d.producto?.nombre?.toLowerCase().includes(query)) || false;

      return idMatch || usuarioMatch || almacenMatch || metodoMatch || detalleMatch;
    });
  });

  kpiTotalMonto = computed(() => {
    return this.ventasFiltradas().reduce((acc, v) => acc + Number(v.total || 0), 0);
  });

  kpiTotalEfectivo = computed(() => {
    return this.ventasFiltradas()
      .filter(v => v.metodo_pago === 'efectivo')
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
  });

  kpiTotalTransferencia = computed(() => {
    return this.ventasFiltradas()
      .filter(v => v.metodo_pago === 'transferencia')
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
  });

  kpiTotalTarjeta = computed(() => {
    return this.ventasFiltradas()
      .filter(v => v.metodo_pago === 'tarjeta')
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
  });

  kpiTotalTransacciones = computed(() => this.ventasFiltradas().length);

  // Privilegios para ver costos y ganancias (solo directivos)
  puedeVerGanancias = computed<boolean>(() => {
    return this.authService.tieneRol(['master', 'administrador', 'supervisor']);
  });

  kpiTotalCosto = computed(() => {
    if (!this.puedeVerGanancias()) return 0;
    return this.ventasFiltradas().reduce((totalCosto, venta) => {
      return totalCosto + this.calcularCostoVenta(venta);
    }, 0);
  });

  kpiTotalGanancia = computed(() => {
    if (!this.puedeVerGanancias()) return 0;
    return this.kpiTotalMonto() - this.kpiTotalCosto();
  });

  kpiMargenPorcentaje = computed(() => {
    const total = this.kpiTotalMonto();
    if (total <= 0) return 0;
    const margen = (this.kpiTotalGanancia() / total) * 100;
    return Math.round(margen * 10) / 10;
  });

  calcularCostoVenta(venta: VentaResponse): number {
    if (!venta.detalles || venta.detalles.length === 0) return 0;
    return venta.detalles.reduce((subtotalCosto, item) => {
      const costoUnitario = Number(item.lote?.precio_compra_unitario || 0);
      const unidades = Number(item.cantidad || 0);
      return subtotalCosto + (unidades * costoUnitario);
    }, 0);
  }

  calcularGananciaVenta(venta: VentaResponse): number {
    const total = Number(venta.total || 0);
    const costo = this.calcularCostoVenta(venta);
    return Math.round((total - costo) * 100) / 100;
  }

  calcularMargenVenta(venta: VentaResponse): number {
    const total = Number(venta.total || 0);
    if (total <= 0) return 0;
    const ganancia = this.calcularGananciaVenta(venta);
    const margen = (ganancia / total) * 100;
    return Math.round(margen * 10) / 10;
  }

  calcularCostoItem(item: any): number {
    const costoUnit = Number(item.lote?.precio_compra_unitario || 0);
    const cant = Number(item.cantidad || 0);
    return cant * costoUnit;
  }

  calcularGananciaItem(item: any): number {
    const subtotal = Number(item.subtotal || 0);
    return subtotal - this.calcularCostoItem(item);
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    // 1. Cargar almacenes
    this.almacenService.listar().subscribe({
      next: (alms) => this.almacenes.set(alms),
      error: () => {}
    });

    // 2. Comprobar turno activo del usuario
    this.turnoService.turnoActivo().subscribe({
      next: (turno) => {
        this.turnoActivo.set(turno);
        // Si no hay turno activo, cambiar filtro por defecto a 'hoy'
        if (!turno && this.filtroAlcance() === 'turno_actual') {
          this.filtroAlcance.set('hoy');
        }
        this.cargarVentas();
      },
      error: () => {
        this.turnoActivo.set(null);
        if (this.filtroAlcance() === 'turno_actual') {
          this.filtroAlcance.set('hoy');
        }
        this.cargarVentas();
      }
    });
  }

  cargarVentas(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    const filtros: VentaFiltros = {};

    // Alcance
    const alcance = this.filtroAlcance();
    const turno = this.turnoActivo();

    if (alcance === 'turno_actual') {
      if (turno) {
        filtros.turno_id = turno.id;
      } else {
        // Fallback hoy
        const hoy = new Date().toISOString().split('T')[0];
        filtros.fecha = hoy;
      }
    } else if (alcance === 'hoy') {
      const hoy = new Date().toISOString().split('T')[0];
      filtros.fecha = hoy;
    }

    // Método de pago
    if (this.filtroMetodoPago()) {
      filtros.metodo_pago = this.filtroMetodoPago();
    }

    // Almacén
    if (this.filtroAlmacenId()) {
      filtros.almacen_id = this.filtroAlmacenId();
    }

    this.ventaService.listar(filtros).subscribe({
      next: (lista) => {
        this.ventas.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(err.error?.message || 'Error al cargar el historial de ventas.');
      }
    });
  }

  cambiarAlcance(alcance: 'turno_actual' | 'hoy' | 'todos'): void {
    this.filtroAlcance.set(alcance);
    this.cargarVentas();
  }

  cambiarMetodoPago(metodo: string): void {
    this.filtroMetodoPago.set(metodo);
    this.cargarVentas();
  }

  cambiarAlmacen(almacenId: string): void {
    this.filtroAlmacenId.set(almacenId);
    this.cargarVentas();
  }

  // MODAL DETALLE
  abrirModalDetalle(venta: VentaResponse): void {
    this.ventaSeleccionada.set(venta);
    this.modalDetalleAbierto.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.ventaSeleccionada.set(null);
  }

  // MODAL EDICION METODO PAGO
  abrirModalEditarPago(venta: VentaResponse): void {
    this.ventaAEditar.set(venta);
    const actual = venta.metodo_pago as 'efectivo' | 'transferencia' | 'tarjeta';
    this.nuevoMetodoPago.set(actual || 'efectivo');
    this.errorModalPago.set(null);
    this.modalEditarPagoAbierto.set(true);
  }

  cerrarModalEditarPago(): void {
    this.modalEditarPagoAbierto.set(false);
    this.ventaAEditar.set(null);
    this.errorModalPago.set(null);
  }

  guardarNuevoMetodoPago(): void {
    const venta = this.ventaAEditar();
    if (!venta) return;

    const nuevoMetodo = this.nuevoMetodoPago();
    if (nuevoMetodo === venta.metodo_pago) {
      this.cerrarModalEditarPago();
      return;
    }

    this.guardandoPago.set(true);
    this.errorModalPago.set(null);

    this.ventaService.actualizarMetodoPago(venta.id, nuevoMetodo).subscribe({
      next: (res) => {
        this.guardandoPago.set(false);
        const ventaActualizada = res.venta;
        // Actualizar en la lista local
        this.ventas.update(lista =>
          lista.map(v => (v.id === ventaActualizada.id ? { ...v, metodo_pago: ventaActualizada.metodo_pago } : v))
        );

        this.cerrarModalEditarPago();
        this.mostrarMensajeExito(
          `Pago de venta #${venta.id.substring(0, 8)} corregido a ${this.getNombreMetodo(nuevoMetodo)}. El arqueo de caja se actualizó automáticamente.`
        );
      },
      error: (err) => {
        this.guardandoPago.set(false);
        this.errorModalPago.set(err.error?.message || 'Error al actualizar el método de pago.');
      }
    });
  }

  mostrarMensajeExito(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => {
      if (this.successMsg() === msg) {
        this.successMsg.set(null);
      }
    }, 6000);
  }

  getNombreMetodo(metodo?: string | null): string {
    switch (metodo) {
      case 'efectivo': return 'Efectivo (Gaveta)';
      case 'transferencia': return 'QR / Transferencia (Banco)';
      case 'tarjeta': return 'Tarjeta';
      default: return 'No especificado';
    }
  }

  formatMoneda(val: number | string | null | undefined): string {
    const num = Number(val || 0);
    return `$${num.toFixed(2)}`;
  }

  formatFecha(fechaIso?: string): string {
    if (!fechaIso) return '-';
    const d = new Date(fechaIso);
    return d.toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
