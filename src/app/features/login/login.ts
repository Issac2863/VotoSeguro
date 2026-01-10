import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      cedula: ['', [Validators.required, Validators.minLength(10), Validators.pattern('^[0-9]*$')]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.error = '';

      // Simulación de login - Conectar con backend real posteriormente
      const { cedula, password } = this.loginForm.value;

      // TODO: Implementar llamada real al AuthService
      setTimeout(() => {
        // Por ahora simulamos éxito si la cédula es válida
        localStorage.setItem('token', 'fake-jwt-token');
        this.router.navigate(['/admin-dashboard']); // Redirigir al dashboard o donde corresponda
        this.isLoading = false;
      }, 1500);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  // Getters para fácil acceso en el template
  get f() { return this.loginForm.controls; }
}
