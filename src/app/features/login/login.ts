import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // OTP
  codeSent = false;
  verificationCode = '';
  maskedEmail = '';

  // Cámara
  isCameraActive = false;
  capturedImage = '';
  private mediaStream: MediaStream | null = null;

  stepLabels = [
    'Verificación de credenciales',
    'Verificación de identidad (OTP)',
    'Verificación facial'
  ];

  credentialsForm: FormGroup;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.credentialsForm = this.fb.group({
      documentType: ['cedula'],
      documentNumber: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10}$/)
      ]],
      fingerprintCode: ['', [
        Validators.required,
        Validators.pattern(/^[A-Z0-9]{10}$/)
      ]]
    });
  }

  ngOnInit(): void {
    // Suscribirse a la sesión para restaurar el paso actual
    this.subscriptions.push(
      this.authService.session$.subscribe(session => {
        if (session) {
          this.maskedEmail = this.authService.getMaskedEmail();
          // Restaurar paso si hay sesión
          switch (session.step) {
            case 'otp':
              this.currentStep = 2;
              break;
            case 'biometric':
              this.currentStep = 3;
              break;
            case 'complete':
              this.router.navigate(['/voting/instructions']);
              break;
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopCamera();
  }

  /**
   * Paso 1: Validar credenciales
   */
  validateCredentials(): void {
    if (this.credentialsForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos correctamente';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { documentNumber, fingerprintCode } = this.credentialsForm.value;

    this.authService.validateCredentials(documentNumber, fingerprintCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          this.maskedEmail = this.authService.getMaskedEmail();
          this.currentStep = 2;
        } else {
          this.errorMessage = response.message || 'Credenciales inválidas';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al validar credenciales';
      }
    });
  }

  /**
   * Paso 2: Enviar código OTP
   */
  sendCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const cedula = this.credentialsForm.value.documentNumber;

    this.authService.sendOtp(cedula).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.codeSent = true;
        this.successMessage = 'Código enviado a tu correo electrónico';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al enviar el código';
      }
    });
  }

  /**
   * Paso 2b: Verificar código OTP
   */
  verifyOtp(): void {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.errorMessage = 'Ingrese el código de 6 dígitos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const cedula = this.credentialsForm.value.documentNumber;

    this.authService.verifyOtp(cedula, this.verificationCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Código verificado correctamente';
          this.currentStep = 3;
          this.startCamera();
        } else {
          this.errorMessage = response.message || 'Código incorrecto';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al verificar el código';
      }
    });
  }

  /**
   * Paso 3: Iniciar cámara
   */
  async startCamera(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.isCameraActive = true;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.errorMessage = 'No se pudo acceder a la cámara. Por favor, permite el acceso.';
    }
  }

  /**
   * Capturar imagen de la cámara
   */
  captureImage(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      this.capturedImage = canvas.toDataURL('image/jpeg', 0.8);
      this.stopCamera();
    }
  }

  /**
   * Retomar captura
   */
  retakePhoto(): void {
    this.capturedImage = '';
    this.startCamera();
  }

  /**
   * Paso 3: Validar biometría facial y completar login
   */
  verifyAndLogin(): void {
    if (!this.capturedImage) {
      this.errorMessage = 'Por favor, capture una foto';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const cedula = this.credentialsForm.value.documentNumber;

    this.authService.validateBiometric(cedula, this.capturedImage).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Verificación completada';
          this.router.navigate(['/voting/instructions']);
        } else {
          this.errorMessage = response.message || 'Verificación facial fallida';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error en la verificación facial';
      }
    });
  }

  /**
   * Detener cámara
   */
  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      this.isCameraActive = false;
    }
  }

  /**
   * Navegación entre pasos
   */
  nextStep(): void {
    if (this.currentStep === 1) {
      this.validateCredentials();
    } else if (this.currentStep === 2 && this.codeSent) {
      this.verifyOtp();
    } else if (this.currentStep === 3) {
      this.verifyAndLogin();
    }
  }

  previousStep(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.currentStep === 2 && this.codeSent) {
      this.codeSent = false;
    } else if (this.currentStep > 1) {
      if (this.currentStep === 3) {
        this.stopCamera();
        this.capturedImage = '';
      }
      this.currentStep--;
    }
  }

  /**
   * Helpers para validación de formulario
   */
  get documentNumberError(): string {
    const control = this.credentialsForm.get('documentNumber');
    if (control?.hasError('required')) return 'La cédula es obligatoria';
    if (control?.hasError('pattern')) return 'La cédula debe tener 10 dígitos numéricos';
    return '';
  }

  get fingerprintCodeError(): string {
    const control = this.credentialsForm.get('fingerprintCode');
    if (control?.hasError('required')) return 'El código dactilar es obligatorio';
    if (control?.hasError('pattern')) return 'El código debe tener 10 caracteres (mayúsculas y números)';
    return '';
  }
}
