import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TurnoCaja, Almacen } from '../models/pos.models';
import { AlmacenService } from './almacen.service';

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  private http = inject(HttpClient);
  private almacenService = inject(AlmacenService);

  /**
   * Consulta si el usuario autenticado tiene un turno abierto.
   * Devuelve TurnoCaja o null.
   */
  turnoActivo(): Observable<TurnoCaja | null> {
    return this.http.get<TurnoCaja | null>('/api/turnos/activo');
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
    return this.http.post<TurnoCaja>('/api/turnos/abrir', payload);
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
    });
  }

  /**
   * Consulta si existe un turno activo en un almacén determinado.
   */
  consultarTurnoAlmacen(almacenId: string): Observable<TurnoCaja | null> {
    return this.http.get<TurnoCaja | null>(`/api/turnos/almacen/${almacenId}/activo`);
  }

  /**
   * Une al usuario autenticado a un turno de caja abierto en el almacén.
   */
  unirse(turnoId: string): Observable<TurnoCaja> {
    return this.http.post<TurnoCaja>(`/api/turnos/${turnoId}/unirse`, {});
  }
}
