import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { tap, catchError, switchMap, timeout } from 'rxjs/operators';
import { Producto } from '../models/pos.models';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {
  private http = inject(HttpClient);
  private db = inject(DbService);

  /**
   * Intenta obtener los productos del servidor primero con timeout de 2.5s.
   * Si responde bien, actualiza la caché local en IndexedDB (fire-and-forget).
   * Si hay timeout o error de red/servidor, recurre a productos_cache de inmediato.
   * Si la caché local también está vacía, propaga el error.
   */
  listar(): Observable<Producto[]> {
    return this.http.get<Producto[]>('/api/productos').pipe(
      timeout(2500),
      tap((productos) => {
        // Fire-and-forget: guardar/reemplazar en productos_cache sin bloquear
        this.guardarEnCache(productos);
      }),
      catchError((error) => {
        // Recurrir a IndexedDB
        return from(this.db.productos_cache.toArray()).pipe(
          switchMap((cached) => {
            if (cached && cached.length > 0) {
              return of(cached);
            }
            // Si no hay nada en caché, propagar error original
            throw error;
          })
        );
      })
    );
  }

  crear(producto: Partial<Producto>): Observable<Producto> {
    return this.http.post<Producto>('/api/productos', producto);
  }

  actualizar(id: string, producto: Partial<Producto>): Observable<Producto> {
    return this.http.put<Producto>(`/api/productos/${id}`, producto);
  }

  desactivar(id: string): Observable<{ message: string; producto: Producto }> {
    return this.http.delete<{ message: string; producto: Producto }>(`/api/productos/${id}`);
  }

  private async guardarEnCache(productos: Producto[]): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.productos_cache, async () => {
        await this.db.productos_cache.clear();
        await this.db.productos_cache.bulkPut(productos);
      });
    } catch {
      // No interrumpir el flujo si IndexedDB falla
    }
  }
}
