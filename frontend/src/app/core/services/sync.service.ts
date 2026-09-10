import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DbService } from './db.service';
import { RegistrarVentaPayload, VentaResponse, VentaPendienteLocal } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private http = inject(HttpClient);
  private db = inject(DbService);

  // Signals reactivos para la UI
  sincronizando = signal<boolean>(false);
  conteoPendientes = signal<number>(0);
  conteoConflictos = signal<number>(0);
  ventasEnConflicto = signal<VentaPendienteLocal[]>([]);

  constructor() {
    this.actualizarConteos();
  }

  /**
   * Actualiza los conteos reactivos leyendo desde IndexedDB.
   */
  async actualizarConteos(): Promise<void> {
    try {
      const pendientes = await this.db.ventas_pendientes.where('estado').equals('pendiente').count();
      const conflictos = await this.db.ventas_pendientes.where('estado').equals('conflicto').toArray();

      this.conteoPendientes.set(pendientes);
      this.conteoConflictos.set(conflictos.length);
      this.ventasEnConflicto.set(conflictos);
    } catch {
      // IndexedDB no disponible o en entorno restringido
    }
  }

  /**
   * Sincroniza todas las ventas pendientes.
   * Se ejecuta EXCLUSIVAMENTE en los 3 momentos permitidos:
   * 1. Evento 'online' del navegador.
   * 2. Montaje de /venta (si hay pendientes).
   * 3. Tras una venta nueva enviada con éxito.
   */
  async sincronizarPendientes(): Promise<void> {
    if (this.sincronizando()) return;

    this.sincronizando.set(true);

    try {
      const pendientes = await this.db.ventas_pendientes
        .where('estado')
        .equals('pendiente')
        .toArray();

      for (const venta of pendientes) {
        const payload: RegistrarVentaPayload = {
          almacen_id: venta.almacen_id,
          turno_id: venta.turno_id,
          metodo_pago: venta.metodo_pago,
          client_uuid: venta.client_uuid,
          vendida_en: venta.vendida_en,
          items: venta.items,
        };

        try {
          const resp = await firstValueFrom(
            this.http.post<VentaResponse>('/api/ventas', payload)
          );

          if (resp) {
            // Éxito 201 (o deduplicado existente): borrar de ventas_pendientes
            await this.db.ventas_pendientes.delete(venta.client_uuid);
          }
        } catch (err: unknown) {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 422) {
              // Conflicto de negocio (ej. stock insuficiente): NO borrar, marcar como conflicto
              const mensaje = err.error?.message || 'Error de validación o stock insuficiente al sincronizar.';
              await this.db.ventas_pendientes.update(venta.client_uuid, {
                estado: 'conflicto',
                mensaje_error: mensaje,
              });
            } else if (err.status === 0 || !window.navigator.onLine) {
              // Error de red: mantener pendiente y detener el ciclo para evitar peticiones inútiles
              break;
            } else {
              // Otros errores de servidor (ej. 500)
              const mensaje = err.error?.message || `Error HTTP ${err.status} al sincronizar.`;
              await this.db.ventas_pendientes.update(venta.client_uuid, {
                estado: 'conflicto',
                mensaje_error: mensaje,
              });
            }
          } else {
            // Error de red genérico
            break;
          }
        }
      }
    } finally {
      await this.actualizarConteos();
      this.sincronizando.set(false);
    }
  }

  /**
   * Guarda una venta en la cola offline de ventas_pendientes.
   */
  async encolarVentaPendiente(payload: RegistrarVentaPayload): Promise<VentaPendienteLocal> {
    const ventaLocal: VentaPendienteLocal = {
      ...payload,
      client_uuid: payload.client_uuid!,
      estado: 'pendiente',
      mensaje_error: null,
      created_at: new Date().toISOString(),
    };

    await this.db.ventas_pendientes.put(ventaLocal);
    await this.actualizarConteos();
    return ventaLocal;
  }
}
