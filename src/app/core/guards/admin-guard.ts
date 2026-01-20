import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAdminLoggedIn()) {
        return true;
    } else {
        // Redirigir al login de admin si no tiene token de admin
        router.navigate(['/admin/login']);
        return false;
    }
};
