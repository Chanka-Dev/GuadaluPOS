import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TurnoService } from '../../core/services/turno.service';
import { AuthService } from '../../core/services/auth.service';
import { TurnoCaja } from '../../core/models/pos.models';

@Component({
  selector: 'app-turno',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './turno.component.html',
  styleUrls: ['./turno.component.css'],
})
export class TurnoComponent implements OnInit {
  private turnoService = inject(TurnoService);
  readonly authService = inject(AuthService);

  // Estados de datos
  turnoPropio = signal<TurnoCaja | null>(null);
  turnosAbiertosGlobales = signal<TurnoCaja[]>([]);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Modal de arqueo / cierre
  mostrandoModalCierre = signal<boolean>(false);
  turnoACerrar = signal<TurnoCaja | null>(null);
  montoContado: number | null = 0;
  procesandoCierre = signal<boolean>(false);
  resultadoCierre = signal<TurnoCaja | null>(null);
  errorModalMsg = signal<string | null>(null);

  // Rol admin/master
  esAdminOMaster = computed<boolean>(() => {
    return this.authService.tieneRol(['master', 'administrador']);
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    // 1. Cargar turno propio
    this.turnoService.turnoActivo().subscribe({
      next: (turno) => {
        this.turnoPropio.set(turno);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.manejarError(err);
      },
    });

    // 2. Si es admin/master, cargar turnos abiertos de todos los usuarios
    if (this.esAdminOMaster()) {
      this.turnoService.listarAbiertos().subscribe({
        next: (turnos) => {
          this.turnosAbiertosGlobales.set(turnos);
        },
        error: (err) => {
          // No bloqueamos si falla el listado global, pero registramos el error
          this.manejarError(err);
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // MODAL DE ARQUEO Y CIERRE
  // --------------------------------------------------------------------------
  abrirModalCerrar(turno: TurnoCaja): void {
    this.turnoACerrar.set(turno);
    this.montoContado = turno.resumen_contable
      ? Number(turno.resumen_contable.monto_esperado_efectivo)
      : Number(turno.monto_inicial);
    this.resultadoCierre.set(null);
    this.errorModalMsg.set(null);
    this.errorMsg.set(null);
    this.mostrandoModalCierre.set(true);
  }

  cerrarModal(): void {
    this.mostrandoModalCierre.set(false);
    this.turnoACerrar.set(null);
    this.resultadoCierre.set(null);
    this.montoContado = 0;
    this.errorModalMsg.set(null);
  }

  confirmarCierre(): void {
    const turno = this.turnoACerrar();
    const monto = this.montoContado;

    if (!turno) return;
    if (monto === null || isNaN(monto) || monto < 0) {
      this.errorModalMsg.set('Por favor ingrese un monto de efectivo contado válido (mayor o igual a 0).');
      return;
    }

    this.procesandoCierre.set(true);
    this.errorModalMsg.set(null);
    this.errorMsg.set(null);

    this.turnoService.cerrar(turno.id, Number(monto)).subscribe({
      next: (turnoActualizado) => {
        this.procesandoCierre.set(false);
        this.resultadoCierre.set(turnoActualizado);
        this.mostrarExito('Turno de caja cerrado exitosamente.');
        // Recargar datos en segundo plano para actualizar listados
        this.recargarListados();
      },
      error: (err) => {
        this.procesandoCierre.set(false);
        const msg = err.error?.message || err.error?.error || err.message || 'Ocurrió un error al cerrar el turno.';
        this.errorModalMsg.set(msg);
        this.manejarError(err);
      },
    });
  }

  private recargarListados(): void {
    this.turnoService.turnoActivo().subscribe({
      next: (t) => this.turnoPropio.set(t),
    });

    if (this.esAdminOMaster()) {
      this.turnoService.listarAbiertos().subscribe({
        next: (ts) => this.turnosAbiertosGlobales.set(ts),
      });
    }
  }

  // --------------------------------------------------------------------------
  // FORMATEOS Y HELPERS
  // --------------------------------------------------------------------------
  formatearMoneda(val: number | string | null | undefined): string {
    const num = Number(val || 0);
    return `Bs ${num.toFixed(2)}`;
  }

  formatearFechaHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      const dia = pad(d.getDate());
      const mes = pad(d.getMonth() + 1);
      const anio = d.getFullYear();
      const horas = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${dia}/${mes}/${anio} ${horas}:${mins}`;
    } catch {
      return iso;
    }
  }

  obtenerEstadoDiferencia(dif: number | null | undefined): 'sobrante' | 'faltante' | 'exacto' {
    const num = Number(dif || 0);
    if (Math.abs(num) < 0.01) return 'exacto';
    return num > 0 ? 'sobrante' : 'faltante';
  }

  manejarError(err: any): void {
    const msg =
      err.error?.message ||
      err.error?.error ||
      err.message ||
      'Ocurrió un error inesperado al procesar la solicitud.';
    this.errorMsg.set(msg);
  }

  cerrarAlertaError(): void {
    this.errorMsg.set(null);
  }

  mostrarExito(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => {
      if (this.successMsg() === msg) {
        this.successMsg.set(null);
      }
    }, 5000);
  }

  cerrarAlertaExito(): void {
    this.successMsg.set(null);
  }
}
