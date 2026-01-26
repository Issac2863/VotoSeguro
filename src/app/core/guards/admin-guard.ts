import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.isAdminLoggedIn().pipe(
        map(isAuthenticated => {
            if (isAuthenticated) {
                return true;
            } else {
                router.navigate(['/admin/login']);
                return false;
            }
        }),
        catchError((error) => {
            console.error('AdminGuard - Error:', error);
            router.navigate(['/admin/login']);
            return of(false);
        })
    );
};
