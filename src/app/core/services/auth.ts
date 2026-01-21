import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map, delay } from 'rxjs/operators';
import { environment } from '../config/environment';

export interface AuthSession {
  sessionId: string;
  cedula: string;
  email?: string;
  step: 'credentials' | 'otp' | 'biometric' | 'complete';
}

export interface ValidateCredentialsResponse {
  success: boolean;
  message: string;
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

  constructor(private http: HttpClient) {
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
    }).pipe(
      tap(response => {
        if (response.success) {
          const session: AuthSession = {
            sessionId: response.sessionId || this.generateSessionId(),
            cedula,
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
  sendOtp(cedula: string): Observable<any> {

    return this.http.post<any>(`${this.apiUrl}/auth/send-otp`, { cedula }).pipe(

      catchError(this.handleError)
    );
  }

  /**
   * Paso 2b: Verificar código OTP
   */
  verifyOtp(cedula: string, otpCode: string): Observable<ValidateOtpResponse> {
    return this.http.post<ValidateOtpResponse>(`${this.apiUrl}/auth/otp`, {
      cedula,
      otpCode
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
  validateBiometric(cedula: string, imagenFacial: string): Observable<ValidateBiometricResponse> {
    return this.http.post<ValidateBiometricResponse>(`${this.apiUrl}/auth/biometrics`, {
      cedula,
      image: imagenFacial // Renombrado a 'image' según DTO del Gateway
    }).pipe(
      tap(response => {
        // Backend devuelve 'accessToken', verificamos ambas opciones por compatibilidad
        const token = response.accessToken || response.token;
        if (response.success && token) {
          localStorage.setItem('token', token);
          // Guardar tiempo de expiración para el timer de votación
          if (response.expirationTime) {
            localStorage.setItem('votingExpirationTime', response.expirationTime.toString());
          }
          const currentSession = this.sessionSubject.value;
          if (currentSession) {
            currentSession.step = 'complete';
            this.setSession(currentSession);
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
    localStorage.removeItem('token');
    localStorage.removeItem('authSession');
    this.sessionSubject.next(null);
  }

  /**
   * Login Administrador
   */
  adminLogin(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/admin/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.token) {
          localStorage.setItem('admin_token', response.token);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Verificar si es admin
   */
  isAdminLoggedIn(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  /**
   * Verificar si completó la autenticación
   */
  isAuthComplete(): boolean {
    const session = this.sessionSubject.value;
    return session?.step === 'complete' && this.isLoggedIn();
  }

  /**
   * Obtener el paso actual
   */
  getCurrentStep(): string {
    return this.sessionSubject.value?.step || 'credentials';
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
