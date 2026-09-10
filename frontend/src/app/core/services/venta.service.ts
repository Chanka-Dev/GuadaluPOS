import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { RegistrarVentaPayload, VentaFiltros, VentaResponse } from '../models/pos.models';
import { SyncService } from './sync.service';

@Injectable({
  providedIn: 'root',
})
export class VentaService {
  private http = inject(HttpClient);
  private syncService = inject(SyncService);

  /**
   * Lista las ventas desde el servidor con filtros opcionales.
   */
  listar(filtros?: VentaFiltros): Observable<VentaResponse[]> {
    let params = new HttpParams();
    if (filtros) {
      if (filtros.turno_id) params = params.set('turno_id', filtros.turno_id);
      if (filtros.almacen_id) params = params.set('almacen_id', filtros.almacen_id);
      if (filtros.metodo_pago) params = params.set('metodo_pago', filtros.metodo_pago);
      if (filtros.fecha) params = params.set('fecha', filtros.fecha);
      if (filtros.usuario_id) params = params.set('usuario_id', filtros.usuario_id.toString());
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
    }
    return this.http.get<VentaResponse[]>('/api/ventas', { params });
  }

  /**
   * Actualiza el método de pago de una venta para corregir errores de caja.
   */
  actualizarMetodoPago(ventaId: string, metodoPago: string): Observable<{ message: string; venta: VentaResponse }> {
    return this.http.patch<{ message: string; venta: VentaResponse }>(`/api/ventas/${ventaId}/metodo-pago`, {
      metodo_pago: metodoPago,
    });
  }

  /**
   * Registra una venta en el backend.
   * 1. Siempre incluye client_uuid.
   * 2. Si responde 201: éxito y dispara sincronización en paralelo del resto de la cola.
   * 3. Si responde 422: error de negocio (stock insuficiente), NO guarda offline y propaga error.
   * 4. Si falla por error de RED: guarda en ventas_pendientes como "pendiente" y retorna señal offline.
   */
  registrar(datos: Omit<RegistrarVentaPayload, 'client_uuid'> & { client_uuid?: string }): Observable<VentaResponse> {
    const clientUuid = datos.client_uuid || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : this.generarUUIDAlternativo());

    const payload: RegistrarVentaPayload = {
      ...datos,
      client_uuid: clientUuid,
    };

    return this.http.post<VentaResponse>('/api/ventas', payload).pipe(
      tap(() => {
        // Disparador 3: Inmediatamente después de que una venta NUEVA se envía con éxito,
        // aprovechar la conexión confirmada para intentar vaciar el resto de la cola
        this.syncService.sincronizarPendientes();
      }),
      catchError((error: unknown) => {
        // 4. Si es un error HTTP real con status (ej. 422 stock insuficiente, 403, etc.):
        // propagar tal cual para que el componente lo muestre de inmediato
        if (error instanceof HttpErrorResponse && error.status !== 0) {
          return throwError(() => error);
        }

        // 5. Si es un error de RED (status === 0, offline, timeout sin respuesta):
        // Guardar la venta en la cola ventas_pendientes
        return from(this.guardarVentaOffline(payload));
      })
    );
  }

  private async guardarVentaOffline(payload: RegistrarVentaPayload): Promise<VentaResponse> {
    await this.syncService.encolarVentaPendiente(payload);

    // Calcular un total estimado sumando los items para la confirmación visual
    return {
      id: payload.client_uuid!,
      usuario_id: 0,
      almacen_id: payload.almacen_id,
      turno_id: payload.turno_id,
      total: '0.00',
      metodo_pago: payload.metodo_pago,
      client_uuid: payload.client_uuid,
      vendida_en: payload.vendida_en,
      created_at: new Date().toISOString(),
      offline: true,
    };
  }

  private generarUUIDAlternativo(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
