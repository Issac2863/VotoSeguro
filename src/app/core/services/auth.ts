import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api'; // Ajustar según backend real

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    // TODO: Reemplazar con llamada HTTP real
    // return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(...)

    // Simulación
    return of({ token: 'mock-jwt-token-123456', user: { name: 'Votante', role: 'voter' } }).pipe(
      delay(1000), // Simular latencia de red
      tap(response => this.setSession(response))
    );
  }

  private setSession(authResult: any) {
    localStorage.setItem('token', authResult.token);
    // localStorage.setItem('user', JSON.stringify(authResult.user));
  }

  logout() {
    localStorage.removeItem('token');
    // localStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}

