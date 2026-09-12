import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Resuelve la URL base: si la app corre dentro del APK nativo (Capacitor),
 * redirige las peticiones relativas (/api/...) a la IP del servidor central.
 */
function resolverUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 1. Comprobar si hay host personalizado en localStorage
  if (typeof localStorage !== 'undefined') {
    const hostCustom = localStorage.getItem('guadalupos_api_host');
    if (hostCustom) {
      return `${hostCustom.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  }

  // 2. Comprobar si corre en entorno nativo Capacitor
  const isCapacitor = typeof (window as any) !== 'undefined' &&
    (!!(window as any).Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:');

  if (isCapacitor) {
    return `http://181.188.171.38${url.startsWith('/') ? '' : '/'}${url}`;
  }

  return url;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const targetUrl = resolverUrl(req.url);

  let authReq = req.clone({
    url: targetUrl,
  });

  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si la API responde 401 Unauthorized y no es la ruta de login
      if (error.status === 401 && !req.url.includes('/login')) {
        authService.limpiarSesion();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
