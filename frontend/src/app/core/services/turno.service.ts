import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, timeout } from 'rxjs/operators';
import { TurnoCaja, Almacen } from '../models/pos.models';
import { AlmacenService } from './almacen.service';

const TURNO_CACHE_KEY = 'guadalupos_turno_activo';

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private http = inject(HttpClient);
  private almacenService = inject(AlmacenService);

  /**
   * Consulta si el usuario autenticado tiene un turno abierto.
   * Si responde el servidor, actualiza la caché local.
   * Si hay timeout (2.5s) o fallo de red, recurre al turno guardado en caché local.
   */
  turnoActivo(): Observable<TurnoCaja | null> {
    return this.http.get<TurnoCaja | null>('/api/turnos/activo').pipe(
      timeout(2500),
      tap((turno) => {
        if (turno) {
          this.guardarTurnoEnCache(turno);
        } else {
          this.limpiarTurnoCache();
        }
      }),
      catchError(() => {
        // Red caída o lenta: recuperar turno de caché local para no bloquear la venta
        const cache = this.obtenerTurnoDeCache();
        return of(cache);
      })
    );
  }

  /**
   * Abre un turno de caja para el usuario autenticado.
   */
  abrir(montoInicial: number, almacenId?: string): Observable<TurnoCaja> {
    const payload: { monto_inicial: number; almacen_id?: string } = {
      monto_inicial: montoInicial,
    };
    if (almacenId) {
      payload.almacen_id = almacenId;
    }
    return this.http.post<TurnoCaja>('/api/turnos/abrir', payload).pipe(
      tap((turno) => this.guardarTurnoEnCache(turno))
    );
  }

  /**
   * Obtiene la lista de almacenes disponibles para seleccionar al abrir turno.
   * Reutiliza AlmacenService para evitar duplicar llamadas HTTP.
   */
  listarAlmacenes(): Observable<Almacen[]> {
    return this.almacenService.listar();
  }

  /**
   * Obtiene los turnos actualmente abiertos (incluyendo usuario y almacén).
   * Restringido a master y administrador.
   */
  listarAbiertos(): Observable<TurnoCaja[]> {
    return this.http.get<TurnoCaja[]>('/api/turnos?estado=abierto');
  }

  /**
   * Cierra un turno de caja enviando el arqueo de efectivo contado.
   */
  cerrar(turnoId: string, montoFinalContado: number): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`/api/turnos/${turnoId}/cerrar`, {
      monto_final_contado: montoFinalContado,
    }).pipe(
      tap(() => this.limpiarTurnoCache())
    );
  }

  /**
   * Consulta si existe un turno activo en un almacén determinado.
   */
  consultarTurnoAlmacen(almacenId: string): Observable<TurnoCaja | null> {
    return this.http.get<TurnoCaja | null>(`/api/turnos/almacen/${almacenId}/activo`).pipe(
      timeout(2500),
      catchError(() => of(null))
    );
  }

  /**
   * Une al usuario autenticado a un turno de caja abierto en el almacén.
   */
  unirse(turnoId: string): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`/api/turnos/${turnoId}/unirse`, {}).pipe(
      tap((turno) => this.guardarTurnoEnCache(turno))
    );
  }

  private guardarTurnoEnCache(turno: TurnoCaja): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TURNO_CACHE_KEY, JSON.stringify(turno));
      }
    } catch {
      // Ignorar errores de quota o entorno restringido
    }
  }

  private obtenerTurnoDeCache(): TurnoCaja | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const item = localStorage.getItem(TURNO_CACHE_KEY);
        if (item) {
          return JSON.parse(item) as TurnoCaja;
        }
      }
    } catch {
      // Ignorar json parsing errors
    }
    return null;
  }

  private limpiarTurnoCache(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TURNO_CACHE_KEY);
      }
    } catch {
      // Ignorar
    }
  }
}
