import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map, delay } from 'rxjs/operators';
import { environment } from '../config/environment';
import { CookieService } from './cookie.service';

export interface AuthSession {
  sessionId: string;
  cedula: string;
  backendId?: string; // ID que devuelve el backend para usar en siguientes llamadas
  email?: string;
  step: 'credentials' | 'otp' | 'biometric' | 'complete';
  isAdmin?: boolean; // Nuevo campo para identificar sesiones de admin
  isVoterComplete?: boolean; // Marca específica para votantes completamente autenticados
}

export interface ValidateCredentialsResponse {
  success: boolean;
  message: string;
  id?: string | number; // ID que devuelve el backend
  email?: string;
  sessionId?: string;
}

export interface ValidateOtpResponse {
  success: boolean;
  message: string;
}

export interface ValidateBiometricResponse {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string; // Nuevo formato del backend
  expirationTime?: number; // Unix timestamp de expiración
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  public session$ = this.sessionSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    // Restaurar sesión si existe
    const savedSession = localStorage.getItem('authSession');
    if (savedSession) {
      this.sessionSubject.next(JSON.parse(savedSession));
    }
  }

  /**
   * Paso 1: Validar cédula y código dactilar
   */
  validateCredentials(cedula: string, codigoDactilar: string): Observable<ValidateCredentialsResponse> {
    return this.http.post<ValidateCredentialsResponse>(`${this.apiUrl}/auth/identity`, {
      cedula,
      codigoDactilar
    }, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success) {
          const session: AuthSession = {
            sessionId: response.sessionId || this.generateSessionId(),
            cedula,
            backendId: String(response.id), // Guardar el ID del backend
            email: response.email,
            step: 'otp'
          };
          this.setSession(session);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Paso 2: Enviar código OTP al email
   */
  sendOtp(): Observable<any> {
    const currentSession = this.sessionSubject.value;
    const backendId = currentSession?.backendId;
    
    if (!backendId) {
      return throwError(() => new Error('No hay sesión activa o falta ID del backend'));
    }
    
    return this.http.post<any>(`${this.apiUrl}/auth/request-otp`, { 
      id: backendId 
    }, {
      withCredentials: true
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Paso 2b: Verificar código OTP
   */
  verifyOtp(otpCode: string): Observable<ValidateOtpResponse> {
    const currentSession = this.sessionSubject.value;
    const backendId = currentSession?.backendId;
    
    if (!backendId) {
      return throwError(() => new Error('No hay sesión activa o falta ID del backend'));
    }
    
    return this.http.post<ValidateOtpResponse>(`${this.apiUrl}/auth/otp`, {
      id: backendId,
      otpCode
    }, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.success) {
          const currentSession = this.sessionSubject.value;
          if (currentSession) {
            currentSession.step = 'biometric';
            this.setSession(currentSession);
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Paso 3: Validar biometría facial
   */
  validateBiometric(imagenFacial: string): Observable<ValidateBiometricResponse> {
    const currentSession = this.sessionSubject.value;
    const backendId = currentSession?.backendId;
    
    if (!backendId) {
      return throwError(() => new Error('No hay sesión activa o falta ID del backend'));
    }
    
    return this.http.post<ValidateBiometricResponse>(`${this.apiUrl}/auth/biometrics`, {
      id: backendId,
      image: imagenFacial // Renombrado a 'image' según DTO del Gateway
    }, {
      withCredentials: true // Permite recepción de cookies
    }).pipe(
      tap(response => {
        if (response.success) {
          // Ya no guardamos token en localStorage para cookies httpOnly
          // El servidor configura automáticamente la cookie segura
          // Guardar tiempo de expiración en sessionStorage (no sensible)
          if (response.expirationTime) {
            sessionStorage.setItem('votingExpirationTime', response.expirationTime.toString());
          }
          const currentSession = this.sessionSubject.value;
          if (currentSession) {
            currentSession.step = 'complete';
            currentSession.isVoterComplete = true; // Marcar específicamente como votante
            this.setSession(currentSession);
            
            // Marcar el tiempo de autenticación completada
            sessionStorage.setItem('authCompleteTime', Date.now().toString());
            
            // Verificar cookies después del login
            this.verifyCookieStatus();
          }
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    localStorage.removeItem('authSession');
    sessionStorage.removeItem('votingExpirationTime');
    this.cookieService.clearAuthCookies();
    this.sessionSubject.next(null);
  }

  /**
   * Login Administrador
   */
  adminLogin(credentials: any): Observable<any> {
    
    return this.http.post<any>(`${this.apiUrl}/auth/admin/login`, credentials, {
      withCredentials: true // Importante: permite envío/recepción de cookies
    }).pipe(
      tap(response => {
        
        // Ya no guardamos token en localStorage
        // Las cookies httpOnly se manejan automáticamente por el navegador
        if (response.success) {
          
          // Establecer estado de admin en la sesión
          const adminSession: AuthSession = {
            sessionId: this.generateSessionId(),
            cedula: '', // Los admin no tienen cédula
            email: credentials.email, // Guardar el email para referencia
            step: 'complete',
            isAdmin: true,
            isVoterComplete: false // Admin NO es votante
          };
          this.setSession(adminSession);

        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Verificar si el usuario está autenticado
   * Para cookies httpOnly, verificamos el estado de la sesión
   */
  isLoggedIn(): boolean {
    const session = this.sessionSubject.value;
    return session?.step === 'complete';
  }

  /**
   * Verificar si es admin
   * Verifica tanto el estado local como la validez de la cookie con el servidor
   */
  isAdminLoggedIn(): Observable<boolean> {
    const session = this.sessionSubject.value;
    const hasLocalAdminSession = session?.isAdmin === true && session?.step === 'complete';
    
    if (!hasLocalAdminSession) {
      return of(false);
    }

    // Verificar que la cookie sea válida haciendo una petición al servidor
    return this.http.get(`${this.apiUrl}/election/all`, {
      withCredentials: true
    }).pipe(
      map(() => {
        return true;
      }),
      catchError((error) => {
        if (error.status === 401) {
          // Cookie expirada o inválida, limpiar estado local
          this.clearAdminSession();
        }
        return of(false);
      })
    );
  }

  /**
   * Verificar si completó la autenticación
   * SOLO para votantes - excluye administradores
   */
  isAuthComplete(): boolean {
    const session = this.sessionSubject.value;
    // Debe tener step complete Y ser específicamente votante (no admin)
    const isComplete = session?.step === 'complete' && session?.isVoterComplete === true && session?.isAdmin !== true;
    return isComplete;
  }

  /**
   * Verificar si la cookie del votante es válida con el servidor
   */
  isVoterCookieValid(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/voting/validate-session`, {
      withCredentials: true
    }).pipe(
      map((response: any) => {
        
        // Si la cookie es válida pero no tenemos sesión local, crearla
        const currentSession = this.sessionSubject.value;
        if (!currentSession || currentSession.step !== 'complete') {
          const restoredSession: AuthSession = {
            sessionId: 'restored_' + Date.now(),
            cedula: response.userId || '', 
            step: 'complete',
            isVoterComplete: true,
            isAdmin: false
          };
          this.setSession(restoredSession);
        }
        
        return true;
      }),
      catchError((error) => {
        if (error.status === 401) {
          // Cookie expirada o inválida, limpiar estado local
          localStorage.removeItem('authSession');
          sessionStorage.removeItem('votingExpirationTime');
          sessionStorage.removeItem('authCompleteTime');
          this.sessionSubject.next(null);
        }
        return of(false);
      })
    );
  }

  /**
   * Obtener el paso actual
   */
  getCurrentStep(): string {
    return this.sessionSubject.value?.step || 'credentials';
  }

  /**
   * Logout de administrador - limpia cookies y estado
   */
  logoutAdmin(): Observable<any> {

    
    return this.http.post(`${this.apiUrl}/auth/admin/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.clearAdminSession();
      }),
      catchError(error => {
        // Incluso si falla el servidor, limpiamos local
        this.clearAdminSession();
        return of({ success: true, message: 'Logout local exitoso' });
      })
    );
  }

  /**
   * Limpiar sesión administrativa
   */
  private clearAdminSession(): void {
    this.cookieService.clearAuthCookies();
    localStorage.removeItem('authSession');
    this.sessionSubject.next(null);
  }

  /**
   * Logout de votante - limpia sesión local E invalida cookie del servidor
   */
  logoutVoter(): Observable<any> {

    
    // Primero limpiar estado local
    this.cookieService.clearAuthCookies();
    localStorage.removeItem('authSession');
    sessionStorage.removeItem('votingExpirationTime');
    sessionStorage.removeItem('authCompleteTime');
    this.sessionSubject.next(null);
    
    // Luego invalidar cookie del servidor
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        // Cookie invalidada exitosamente
      }),
      catchError(error => {
        // Incluso si falla el servidor, la sesión local ya está limpia
        return of({ success: true, message: 'Logout local completado, error en servidor' });
      })
    );
  }

  /**
   * Obtener email enmascarado de la sesión
   */
  getMaskedEmail(): string {
    const email = this.sessionSubject.value?.email;
    if (!email) return '';
    const [user, domain] = email.split('@');
    const masked = user.substring(0, 3) + '*'.repeat(Math.max(user.length - 3, 5));
    return `${masked}@${domain}`;
  }

  private setSession(session: AuthSession): void {
    localStorage.setItem('authSession', JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Verificar el status de las cookies para debugging
   */
  private verifyCookieStatus(): void {
    // Hacer una petición de prueba para verificar que las cookies se envían
    setTimeout(() => {
      this.http.get(`${this.apiUrl}/election/candidates`, {
        withCredentials: true
      }).subscribe({
        next: (response) => {
          // Cookies funcionando correctamente
        },
        error: (error) => {
          // Error en las cookies
        }
      });
    }, 1000);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error inesperado';

    if (error.error instanceof ErrorEvent) {
      // Error del cliente
      errorMessage = error.error.message;
    } else {
      // Error del servidor
      errorMessage = error.error?.message || `Error ${error.status}: ${error.statusText}`;
    }

    console.error('AuthService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
