import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs/operators';

/**
 * Guard para proteger rutas de votación
 * Verifica tanto el estado local como la validez de la cookie con el servidor
 */
export const voterGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    const session = authService['sessionSubject'].value;
    const isLocalVoterComplete = authService.isAuthComplete();
    
    // Si no hay sesión local de votante, intentar validar con cookie del servidor
    if (!isLocalVoterComplete) {
        
        // Validar con el servidor usando la cookie
        return authService.isVoterCookieValid().pipe(
            map((isValid) => {
                if (isValid) {
                    return true;
                } else {
                    router.navigate(['/voter-login']);
                    return false;
                }
            })
        );
    }

    // Verificar si es una navegación reciente después de autenticación
    const authTime = sessionStorage.getItem('authCompleteTime');
    const now = Date.now();
    const timeSinceAuth = authTime ? now - parseInt(authTime) : Infinity;
    
    // Si la autenticación fue hace menos de 10 segundos, no validar cookie con servidor
    if (timeSinceAuth < 10000) {
        return true;
    }

    // Si hay sesión local, verificar con el servidor que la cookie sea válida
    
    return authService.isVoterCookieValid().pipe(
        map((isValid) => {
            if (isValid) {
                return true;
            } else {
                router.navigate(['/voter-login']);
                return false;
            }
        })
    );
};
