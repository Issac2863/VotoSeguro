import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para proteger rutas de votación
 * Requiere que el usuario haya completado el flujo de autenticación
 */
export const voterGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthComplete()) {
        return true;
    } else {
        // Redirigir al login de votante si no está autenticado
        router.navigate(['/voter-login']);
        return false;
    }
};
