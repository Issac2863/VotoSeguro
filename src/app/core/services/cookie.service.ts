import { Injectable } from '@angular/core';

/**
 * @class CookieService
 * @description Servicio para manejar cookies de forma segura en el frontend.
 * Este servicio NO puede acceder a cookies httpOnly por seguridad,
 * pero puede manejar el estado de autenticación basado en respuestas del servidor.
 */
@Injectable({
  providedIn: 'root'
})
export class CookieService {

  /**
   * Verificar si existe una cookie específica
   * Nota: Solo funciona para cookies NO httpOnly
   */
  hasCookie(name: string): boolean {
    return document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith(`${name}=`)
    );
  }

  /**
   * Leer una cookie específica
   * Nota: Solo funciona para cookies NO httpOnly
   */
  getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  /**
   * Eliminar una cookie
   */
  deleteCookie(name: string, path: string = '/'): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  }

  /**
   * Limpiar todas las cookies de sesión de la aplicación
   */
  clearAuthCookies(): void {
    // Limpiar cookies de admin (solo las que podemos acceder)
    this.deleteCookie('admin_session_token', '/admin');
    this.deleteCookie('voter_session_token', '/voting');
    
    // También limpiar posibles cookies legacy
    this.deleteCookie('access_token');
  }

  /**
   * Verificar si el navegador soporta cookies
   */
  isCookieSupported(): boolean {
    try {
      document.cookie = 'test=1';
      const supported = document.cookie.indexOf('test=') !== -1;
      this.deleteCookie('test');
      return supported;
    } catch (e) {
      return false;
    }
  }
}