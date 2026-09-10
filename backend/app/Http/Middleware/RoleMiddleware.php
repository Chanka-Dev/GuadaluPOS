<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Exceptions\UnauthorizedException;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Soporta tanto sintaxis separada por comas (role:master,administrador)
     * como sintaxis separada por pipes (role:master|administrador).
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user() ?? Auth::user();

        if (!$user) {
            throw UnauthorizedException::notLoggedIn();
        }

        if (!method_exists($user, 'hasAnyRole')) {
            throw UnauthorizedException::missingTraitHasRoles($user);
        }

        // Desglosar roles soportando comas y pipes
        $parsedRoles = [];
        foreach ($roles as $role) {
            foreach (explode('|', (string)$role) as $r) {
                foreach (explode(',', $r) as $subR) {
                    $trimmed = trim($subR);
                    if ($trimmed !== '') {
                        $parsedRoles[] = $trimmed;
                    }
                }
            }
        }

        if (!$user->hasAnyRole($parsedRoles)) {
            throw UnauthorizedException::forRoles($parsedRoles);
        }

        return $next($request);
    }
}
