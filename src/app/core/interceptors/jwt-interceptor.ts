import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor JWT actualizado para cookies httpOnly
 * Asegura que withCredentials esté configurado para todas las requests relevantes
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Para cookies httpOnly, asegurar que withCredentials esté configurado
  // para todas las solicitudes a nuestros endpoints
  
  const needsCredentials = req.url.includes('/auth/') || 
                         req.url.includes('/admin/') || 
                         req.url.includes('/voting/') || 
                         req.url.includes('/election/');
  
  if (needsCredentials) {
    
    const authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      },
      withCredentials: true // Forzar siempre withCredentials para estas rutas
    });
    
    return next(authReq);
  }
  
  return next(req);
};
