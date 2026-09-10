import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Almacen } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class AlmacenService {
  private http = inject(HttpClient);

  listar(): Observable<Almacen[]> {
    return this.http.get<Almacen[]>('/api/almacenes');
  }

  crear(almacen: Partial<Almacen>): Observable<Almacen> {
    return this.http.post<Almacen>('/api/almacenes', almacen);
  }

  actualizar(id: string, almacen: Partial<Almacen>): Observable<Almacen> {
    return this.http.put<Almacen>(`/api/almacenes/${id}`, almacen);
  }

  desactivar(id: string): Observable<{ message: string; almacen: Almacen }> {
    return this.http.delete<{ message: string; almacen: Almacen }>(`/api/almacenes/${id}`);
  }
}
