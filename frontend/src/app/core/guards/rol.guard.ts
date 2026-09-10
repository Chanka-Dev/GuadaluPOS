import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rolGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rolesPermitidos = (route.data?.['roles'] as string[]) || [];

  if (rolesPermitidos.length === 0) {
    return true;
  }

  if (authService.tieneRol(rolesPermitidos)) {
    return true;
  }

  return router.createUrlTree(['/sin-permiso']);
};
