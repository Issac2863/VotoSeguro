import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EncryptionService } from '../../core/services/encryption.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
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

  // Estados específicos de votación
  votingStatus: 'active' | 'processing' | 'completed' | null = null;
  showVotingStatusMessage = false;

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
    private encryptionService: EncryptionService, // Inyectamos tu servicio
    private http: HttpClient, // Inyectamos el cliente HTTP
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

    // Convertir código dactilar a mayúsculas automáticamente
    this.credentialsForm.get('fingerprintCode')?.valueChanges.subscribe(value => {
      if (value && value !== value.toUpperCase()) {
        this.credentialsForm.get('fingerprintCode')?.setValue(value.toUpperCase(), { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    // Limpiar cualquier sesión anterior al iniciar un nuevo proceso de votante
    // (especialmente importante si había una sesión de admin)
    this.authService.logout();
    
    // Suscribirse a la sesión para restaurar el paso actual
    this.subscriptions.push(
      this.authService.session$.subscribe(session => {
        if (session && session.step && !session.isAdmin) {
          this.maskedEmail = this.authService.getMaskedEmail();
          // Restaurar paso si hay sesión válida de VOTANTE
          switch (session.step) {
            case 'otp':
              this.currentStep = 2;
              break;
            case 'biometric':
              this.currentStep = 3;
              break;
            case 'complete':
              // Solo redirigir si es una sesión de votante completa
              this.router.navigate(['/voting/ballot']);
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

    this.authService.validateCredentials(documentNumber, fingerprintCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = response.message;
          this.maskedEmail = response.email || this.authService.getMaskedEmail();

          // El OTP se envía automáticamente con la validación de credenciales en el backend
          // Por lo tanto, marcamos que el código fue enviado y avanzamos al paso 2
          this.codeSent = true;
          this.currentStep = 2;
          this.cdr.detectChanges();
        } else {
          this.errorMessage = response.message || 'Credenciales inválidas';
        }
      },
      error: (error) => {
        console.error('[LOGIN] Error:', error);
        this.isLoading = false;
        this.handleAuthenticationError(error);
      }
    });
  }

  /**
   * Maneja errores específicos de autenticación según el estado del votante
   */
  private handleAuthenticationError(error: any): void {
    // Desactivar estado de carga
    this.isLoading = false;
    
    const errorMessage = error.message || 'Error desconocido';

    // Limpiar estados anteriores
    this.resetVotingStatus();

    // Verificar diferentes estados del votante
    if (errorMessage.includes('sesión de votación activa')) {
      this.showVotingSessionActiveError();
    } else if (errorMessage.includes('voto está siendo procesado')) {
      this.showVoteProcessingError();
    } else if (errorMessage.includes('ya ha registrado su voto')) {
      this.showAlreadyVotedError();
    } else if (errorMessage.includes('Credenciales inválidas')) {
      this.errorMessage = 'Cédula o código dactilar incorrectos. Verifique sus datos.';
    } else {
      this.errorMessage = 'Error al validar credenciales. Intente nuevamente.';
    }

    // Forzar actualización de la vista
    this.cdr.detectChanges();
  }

  /**
   * Limpia todos los estados y mensajes de votación
   */
  private resetVotingStatus(): void {
    this.votingStatus = null;
    this.showVotingStatusMessage = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Muestra mensaje cuando el usuario tiene una sesión activa
   */
  private showVotingSessionActiveError(): void {
    this.votingStatus = 'active';
    this.showVotingStatusMessage = true;
    this.errorMessage = 'No puede iniciar una nueva sesión porque ya tiene una activa.';
    this.successMessage = 'Espere a que expire su sesión actual o complete su proceso de votación.';
    
    // No mostrar alert ni redireccionar automáticamente
    // Solo mostrar el mensaje informativo
  }

  /**
   * Muestra mensaje cuando el voto está siendo procesado
   */
  private showVoteProcessingError(): void {
    this.votingStatus = 'processing';
    this.showVotingStatusMessage = true;
    this.errorMessage = '⏳ Su voto está siendo procesado. Por favor espere.';
    this.successMessage = '✅ El proceso se completará en unos momentos.';
    
    // Redirigir a resultados después de unos segundos
    setTimeout(() => {
      this.router.navigate(['/results']);
    }, 4000);
  }

  /**
   * Muestra mensaje cuando el usuario ya votó
   */
  private showAlreadyVotedError(): void {
    this.votingStatus = 'completed';
    this.showVotingStatusMessage = true;
    this.errorMessage = '✅ Usted ya ha registrado su voto previamente.';
    this.successMessage = '🗳️ Gracias por participar en el proceso electoral.';
    
    // Opción para ver resultados
    setTimeout(() => {
      if (confirm('¿Desea ver los resultados de la elección?')) {
        this.router.navigate(['/results']);
      } else {
        this.router.navigate(['/']);
      }
    }, 4000);
  }

  /**
   * Paso 2: Reenviar código OTP (función opcional)
   */
  sendCode(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.sendOtp().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.codeSent = true;
        this.successMessage = 'Código reenviado a tu correo electrónico';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al reenviar el código';
        this.cdr.detectChanges();
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

    this.authService.verifyOtp(this.verificationCode).subscribe({
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
  // Cámara
  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId: string = '';

  // ... (otros métodos)

  async getCameras() {
    try {
      // Pedir permisos primero para obtener labels
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(device => device.kind === 'videoinput');



      if (this.availableCameras.length > 0 && !this.selectedCameraId) {
        // Preferir la cámara que no sea la default si hay varias (usualmente USB)
        // O simplemente seleccionar la primera
        this.selectedCameraId = this.availableCameras[0].deviceId;
      }
    } catch (error) {
      console.error('[CAMERA] Error enumerando dispositivos:', error);
    }
  }

  onCameraChange(event: any) {
    const deviceId = event.target.value;
    this.selectedCameraId = deviceId;
    this.startCamera(deviceId);
  }

  /**
   * Paso 3: Iniciar cámara
   */
  async startCamera(deviceId?: string): Promise<void> {

    this.errorMessage = '';

    // Detener stream anterior si existe
    this.stopCamera();

    try {
      await this.getCameras(); // Refrescar lista

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: 640, height: 480 }
          : { width: 640, height: 480 } // Default sin facingMode forzado si no se especifica
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
        this.isCameraActive = true;
        this.cdr.detectChanges();

      }
    } catch (error: any) {
      console.error('[CAMERA] Error accessing camera:', error);
      this.errorMessage = `No se pudo acceder a la cámara: ${error.message}`;
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
    this.errorMessage = '';
    this.startCamera();
  }

  /**
   * Manejar selección de archivo de imagen
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Por favor seleccione un archivo de imagen';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.capturedImage = reader.result as string;
      this.stopCamera();
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
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

    this.authService.validateBiometric(this.capturedImage).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.successMessage = 'Verificación completada';
          // Nuevo flujo: ir directo a votación
          this.router.navigate(['/voting/ballot']);
        } else {
          this.errorMessage = response.message || 'Verificación facial fallida. Intente tomar otra foto.';
          this.capturedImage = ''; // Limpiar para permitir reintentar
          this.startCamera(); // Reactivar cámara
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error en la verificación facial. Intente nuevamente.';
        this.capturedImage = ''; // Limpiar para permitir reintentar
        this.startCamera(); // Reactivar cámara
        this.cdr.detectChanges();
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
