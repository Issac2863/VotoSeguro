import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Como isAdminLoggedIn ahora retorna Observable, necesitamos manejarlo
    return authService.isAdminLoggedIn().pipe(
        map(isAuthenticated => {
            if (isAuthenticated) {
                return true;
            } else {
                // Redirigir al login de admin si no está autenticado
                router.navigate(['/admin/login']);
                return false;
            }
        }),
        catchError(() => {
            // En caso de error, redirigir al login
            router.navigate(['/admin/login']);
            return of(false);
        })
    );
};
