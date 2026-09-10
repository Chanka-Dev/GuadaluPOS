import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse, Usuario } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private readonly tokenKey = 'guadalupos_auth_token';
  private readonly userKey = 'guadalupos_auth_user';

  // Exposición del usuario actual mediante Angular Signals
  readonly usuarioActual = signal<Usuario | null>(this.obtenerUsuarioAlmacenado());

  /**
   * Autentica al usuario con email y contraseña, guardando el token Sanctum en localStorage.
   */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem(this.userKey, JSON.stringify(res.user));
          this.usuarioActual.set(res.user);
        }
      })
    );
  }

  /**
   * Cierra sesión en el backend y limpia el almacenamiento local.
   */
  logout(): void {
    this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.limpiarSesion();
        this.router.navigate(['/login']);
      });
  }

  /**
   * Limpia el token y datos del usuario de localStorage y del estado en memoria.
   */
  limpiarSesion(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.usuarioActual.set(null);
  }

  /**
   * Retorna el token JWT/Sanctum almacenado.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Verifica si el usuario actual posee al menos uno de los roles solicitados.
   */
  tieneRol(roles: string[]): boolean {
    const user = this.usuarioActual();
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }
    return roles.some((rolBuscado) =>
      user.roles.some((r) => (typeof r === 'string' ? r === rolBuscado : r.name === rolBuscado))
    );
  }

  /**
   * Determina si existe una sesión activa.
   */
  estaAutenticado(): boolean {
    return !!this.getToken() && !!this.usuarioActual();
  }

  private obtenerUsuarioAlmacenado(): Usuario | null {
    try {
      const stored = localStorage.getItem(this.userKey);
      return stored ? (JSON.parse(stored) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
