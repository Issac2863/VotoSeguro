import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email: [''],
      password: ['']
    });
  }

  onSubmit(): void {
    this.isLoading = true;
    // Simulación de login
    setTimeout(() => {
      localStorage.setItem('admin_token', 'admin-jwt-token');
      this.router.navigate(['/admin/dashboard']);
      this.isLoading = false;
    }, 1000);
  }
}
