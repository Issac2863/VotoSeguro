import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 🔐 Encriptación en el Cliente (Hashing SHA-256)
      // La contraseña nunca viaja en texto plano por la red (ni siquiera dentro del túnel HTTPS)
      const plainPassword = this.loginForm.value.password;
      const hashedPassword = await this.sha256(plainPassword);

      const credentials = {
        email: this.loginForm.value.email,
        password: hashedPassword
      };

      this.authService.adminLogin(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response && response.success) {
            this.router.navigate(['/admin/dashboard']);
          } else {
            this.errorMessage = response?.message || 'Respuesta inesperada del servidor';
            console.error('Login fallido:', response);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.message || 'Error al iniciar sesión';
          console.error('Error en login:', err);
          alert(this.errorMessage);
        }
      });
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Error de seguridad al procesar credenciales';
      console.error(error);
    }
  }

  /**
   * Generar Hash SHA-256 nativo del navegador
   */
  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
