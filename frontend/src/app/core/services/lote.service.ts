import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Lote, IngresarLotePayload, TransferirLotePayload } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class LoteService {
  private http = inject(HttpClient);

  listar(productoId?: string, almacenId?: string): Observable<Lote[]> {
    let params = new HttpParams();
    if (productoId) {
      params = params.set('producto_id', productoId);
    }
    if (almacenId) {
      params = params.set('almacen_id', almacenId);
    }
    return this.http.get<Lote[]>('/api/lotes', { params });
  }

  ingresar(payload: IngresarLotePayload): Observable<Lote> {
    return this.http.post<Lote>('/api/lotes', payload);
  }

  actualizar(loteId: string, payload: Partial<IngresarLotePayload>): Observable<Lote> {
    return this.http.put<Lote>(`/api/lotes/${loteId}`, payload);
  }

  transferir(loteId: string, payload: TransferirLotePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/lotes/${loteId}/transferir`, payload);
  }
}
