import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proveedor } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  private http = inject(HttpClient);

  listar(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>('/api/proveedores');
  }

  crear(proveedor: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.post<Proveedor>('/api/proveedores', proveedor);
  }

  actualizar(id: string, proveedor: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`/api/proveedores/${id}`, proveedor);
  }

  desactivar(id: string): Observable<{ message: string; proveedor: Proveedor }> {
    return this.http.delete<{ message: string; proveedor: Proveedor }>(`/api/proveedores/${id}`);
  }
}
