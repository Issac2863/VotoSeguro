import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  currentStep = 1;
  codeSent = false;
  verificationCode = '';

  // Correo parcialmente oculto (simulado - en producción vendría del backend)
  maskedEmail = 'miba**********@outlook.com';

  stepLabels = [
    'Verificación de credenciales',
    'Verificación facial',
    'Verificación de identidad'
  ];

  credentialsForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.credentialsForm = this.fb.group({
      documentType: ['cedula'],
      documentNumber: [''],
      fingerprintCode: ['']
    });
  }

  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.codeSent && this.currentStep === 3) {
      this.codeSent = false;
    } else if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  sendCode(): void {
    // Simular envío de código
    this.codeSent = true;
  }

  verifyAndLogin(): void {
    // Navegación a las instrucciones de votación
    this.router.navigate(['/voting/instructions']);
  }
}
