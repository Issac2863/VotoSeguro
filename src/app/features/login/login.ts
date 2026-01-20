import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EncryptionService } from '../../core/services/encryption.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
    private router: Router,
    private encryptionService: EncryptionService, // Inyectamos tu servicio
    private http: HttpClient // Inyectamos el cliente HTTP
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
    /*TEST PARA CIFRAR DATOS
    // 1. Obtener los datos del formulario
    const rawData = {
      cedula: "1500958069",
      codigoDactilar: "V4443V4444"
    }
    console.log('1. Datos originales:', rawData);

    try {
      // 2. Cifrar los datos usando tu EncryptionService
      // Esto convertirá el objeto en un string Base64 ilegible
      const encryptedData = this.encryptionService.encrypt(rawData);
      console.log('2. Datos cifrados (Base64):', encryptedData);

      // 3. Preparar el cuerpo de la petición
      const payload = { data: encryptedData };

      // 4. Enviar al Backend (Gateway)
      // Ajusta la URL según tu configuración de NestJS
      const url = `${environment.apiUrl}/auth/identity`;
      console.log('Enviando datos al servidor en:', url);
      this.http.post(url, payload).subscribe({
        next: (response: any) => {
          console.log('3. Respuesta del servidor:', response);
          // Si el servidor devuelve el pre-token, navegamos*/
          this.router.navigate(['/voting/instructions']);/*
        },
        error: (err) => {
          console.error('Error en la petición:', err);
          alert('Error al verificar credenciales. Revisa la consola.');
        }
      });

    } catch (error) {
      console.error('Error en el proceso de cifrado:', error);
    }*/
  }
}
