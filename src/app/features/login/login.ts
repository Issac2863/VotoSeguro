import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
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
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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
        if (session && session.step) {
          this.maskedEmail = this.authService.getMaskedEmail();
          // Restaurar paso si hay sesión válida
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
            default:
              this.currentStep = 1;
          }
        } else {
          // Sin sesión válida, empezar desde paso 1
          this.currentStep = 1;
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

    console.log('[LOGIN] Iniciando validación de credenciales:', { documentNumber, fingerprintCode });

    this.authService.validateCredentials(documentNumber, fingerprintCode).subscribe({
      next: (response) => {
        console.log('[LOGIN] Respuesta recibida:', response);
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          this.maskedEmail = response.email || this.authService.getMaskedEmail();
          console.log('[LOGIN] Email enmascarado:', this.maskedEmail);
          this.currentStep = 2;
          this.cdr.detectChanges(); // Forzar actualización de UI
        } else {
          this.errorMessage = response.message || 'Credenciales inválidas';
        }
      },
      error: (error) => {
        console.error('[LOGIN] Error:', error);
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
        this.cdr.detectChanges(); // Forzar actualización de UI
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al enviar el código';
        this.cdr.detectChanges(); // Forzar actualización de UI
      }
    });
  }

  /**
   * Paso 2b: Verificar código OTP
   */
  verifyOtp(): void {
    if (!this.verificationCode || this.verificationCode.length !== 8) {
      this.errorMessage = 'Ingrese el código de 8 dígitos';
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
          this.cdr.detectChanges(); // Forzar actualización de UI

          // Esperar a que Angular renderice el Step 3 antes de iniciar la cámara
          setTimeout(() => {
            this.startCamera();
          }, 500);
        } else {
          this.errorMessage = response.message || 'Código incorrecto';
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al verificar el código';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Paso 3: Iniciar cámara
   */
  async startCamera(): Promise<void> {
    console.log('[CAMERA] Iniciando cámara...');

    try {
      // Primero intentar con facingMode 'user' (webcam frontal)
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
        console.log('[CAMERA] Cámara frontal obtenida');
      } catch (frontError) {
        console.log('[CAMERA] facingMode user falló, intentando cualquier cámara...');
        // Si falla, intentar con cualquier cámara disponible (USB)
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        console.log('[CAMERA] Cámara alternativa obtenida');
      }

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.isCameraActive = true;
        this.cdr.detectChanges();
        console.log('[CAMERA] Video reproduciendo');
      } else {
        console.error('[CAMERA] videoElement no encontrado');
        this.errorMessage = 'Error al inicializar el video';
        this.cdr.detectChanges();
      }
    } catch (error: any) {
      console.error('[CAMERA] Error accessing camera:', error);
      this.errorMessage = `No se pudo acceder a la cámara: ${error.message || 'Verifique los permisos'}`;
      this.cdr.detectChanges();
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
