import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor JWT actualizado para cookies httpOnly
 * Ya no necesitamos manejar tokens manualmente - las cookies se envían automáticamente
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Para cookies httpOnly, asegurar que withCredentials esté configurado
  // para todas las solicitudes a nuestros endpoints
  
  if (req.url.includes('/auth/') || req.url.includes('/admin/') || req.url.includes('/voting/') || req.url.includes('/election/')) {
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      },
      // Solo agregar withCredentials si no está ya configurado
      withCredentials: req.withCredentials || true
    });
    return next(authReq);
  }
  
  return next(req);
};
