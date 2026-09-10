import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, CrearUsuarioPayload, ActualizarUsuarioPayload } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la lista completa de usuarios con sus roles asociados.
   */
  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios`);
  }

  /**
   * Crea un nuevo usuario y le asigna su rol inicial.
   */
  crear(payload: CrearUsuarioPayload): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/usuarios`, payload);
  }

  /**
   * Actualiza los datos de un usuario existente y opcionalmente su rol o contraseña.
   */
  actualizar(id: number, payload: ActualizarUsuarioPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/usuarios/${id}`, payload);
  }

  /**
   * Desactiva lógicamente a un usuario. El backend rechaza con 403 si es master.
   */
  desactivar(id: number): Observable<{ message: string; user?: Usuario }> {
    return this.http.delete<{ message: string; user?: Usuario }>(`${this.apiUrl}/usuarios/${id}`);
  }
}
