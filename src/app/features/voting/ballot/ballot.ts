import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElectionService, Election } from '../../../core/services/election.service';
import { VotingService } from '../../../core/services/voting.service';
import { AuthService } from '../../../core/services/auth';

interface Candidate {
  id?: string;
  name: string;
  party: string;
  number: number;
  photo: string;
}

@Component({
  selector: 'app-ballot',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ballot.html',
  styleUrl: './ballot.css',
})
export class BallotComponent implements OnInit, OnDestroy {
  electionTitle = 'Cargando elección...';
  electionId: string | null = null;
  candidates: Candidate[] = [];

  selectedCandidate: number | null = null;
  timeRemaining = 300; // 5 minutos por defecto
  votingStartTime: Date = new Date();
  votingEndTime: Date | null = null;
  isSubmitting = false;
  errorMessage = '';

  // Modal de confirmación
  showConfirmModal = false;
  selectedCandidateId = '';
  selectedCandidateName = '';
  isVoteIntentionSent = false;

  // Pantalla de éxito
  showSuccessScreen = false;
  successMessage = '';
  userEmail = '';

  private timerInterval: any;

  constructor(
    private router: Router,
    private electionService: ElectionService,
    private votingService: VotingService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.initializeTimer();
    this.loadElection();
    this.startTimer();
  }

  /**
   * Inicializa el timer basado en el tiempo de expiración del token
   */
  private initializeTimer(): void {
    const storedExpiration = sessionStorage.getItem('votingExpirationTime');
    if (storedExpiration) {
      const expirationTimestamp = parseInt(storedExpiration, 10);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remaining = expirationTimestamp - nowInSeconds;

      if (remaining > 0) {
        this.timeRemaining = remaining;
        const totalVotingTime = 600;
        this.votingStartTime = new Date((expirationTimestamp - totalVotingTime) * 1000);
      } else {
        this.timeRemaining = 0;
      }
    }
  }

  loadElection() {
    this.electionService.getTodayElections().subscribe({
      next: (elections) => {
        if (elections && elections.length > 0) {
          const currentElection = elections[elections.length - 1];
          this.electionTitle = currentElection.name;
          this.electionId = currentElection.id || null;

          this.candidates = currentElection.candidates.map((c, index) => ({
            id: c.id,
            name: c.name,
            party: c.political_group,
            number: index + 1,
            photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=200`
          }));
        } else {
          this.electionTitle = 'No hay elecciones activas para hoy';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando elecciones:', err);
        this.electionTitle = 'Error al cargar la elección';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.cdr.detectChanges();
      } else {
        this.stopTimer();
        this.autoSubmitVote();
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  selectCandidate(index: number): void {
    this.selectedCandidate = index;
    this.errorMessage = '';
  }

  /**
   * Seleccionar candidato y enviar intención de voto
   */
  selectVote(): void {
    if (this.selectedCandidate === null || !this.electionId) {
      this.errorMessage = 'Debe seleccionar una opción';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Determinar el candidateId basado en la selección
    let candidateId: string;
    let candidateName: string;

    if (this.selectedCandidate >= 0 && this.candidates[this.selectedCandidate]) {
      candidateId = this.candidates[this.selectedCandidate].id || '';
      candidateName = this.candidates[this.selectedCandidate].name;
    } else {
      this.errorMessage = 'Selección inválida';
      this.isSubmitting = false;
      return;
    }

    // Llamar al servicio para enviar intención de voto (cast)
    this.votingService.castVote(candidateId).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.status === 'WAITING_FOR_USER_CONFIRMATION') {
          this.selectedCandidateId = candidateId;
          this.selectedCandidateName = candidateName;
          this.isVoteIntentionSent = true;
          
          // Mostrar modal de confirmación
          this.showConfirmModal = true;
          this.stopTimer(); // Detener timer mientras confirma
        } else {
          this.errorMessage = response.message || 'Error al registrar la selección';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al enviar selección:', err);
        
        // Diagnóstico específico para errores de autenticación
        if (err.status === 401) {
          console.error('🚨 [DEBUG] Error 401 - Problema de autenticación detectado');
          console.error('🔍 [DEBUG] Verificando estado de autenticación local...');
          
          const authComplete = this.authService.isAuthComplete();
          console.error('🔍 [DEBUG] AuthService.isAuthComplete():', authComplete);
          
          // Verificar sesión actual
          const currentSession = this.authService['sessionSubject'].value;
          console.error('🔍 [DEBUG] Sesión actual:', {
            step: currentSession?.step,
            isVoterComplete: currentSession?.isVoterComplete,
            isAdmin: currentSession?.isAdmin,
            cedula: currentSession?.cedula ? '***' : 'sin cédula',
            backendId: currentSession?.backendId ? 'presente' : 'ausente'
          });
          
          console.error('🔍 [DEBUG] Cookies del documento:', document.cookie);
          
          this.errorMessage = 'Sesión expirada o inválida. Por favor, inicie sesión nuevamente.';
          
          // Limpiar sesión y redirigir
          setTimeout(() => {
            this.authService.logoutVoter().subscribe(() => {
              this.router.navigate(['/voter-login']);
            });
          }, 2000);
        } else {
          this.errorMessage = err.error?.message || err.message || 'Error al registrar la selección. Intente nuevamente.';
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Confirmar definitivamente el voto
   */
  confirmVote(): void {
    if (!this.isVoteIntentionSent || !this.selectedCandidateId) {
      this.errorMessage = 'Error: No se ha enviado la intención de voto';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.votingService.confirmVote(this.selectedCandidateId).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        
        if (response.success) {
          // Limpiar datos de sesión
          sessionStorage.removeItem('votingExpirationTime');
          
          // LIMPIAR COMPLETAMENTE EL ESTADO DEL MODAL
          this.showConfirmModal = false;
          this.isVoteIntentionSent = false;
          this.selectedCandidateId = '';
          this.selectedCandidateName = '';
          this.errorMessage = '';
          
          // Detener el timer si está corriendo
          this.stopTimer();
          
          // Configurar pantalla de éxito
          this.successMessage = response.message || '¡Voto registrado exitosamente!';
          this.userEmail = this.getCurrentUserEmail();
          
          // MOSTRAR PANTALLA DE ÉXITO
          this.showSuccessScreen = true;
          
          // Forzar detección de cambios MÚLTIPLES VECES
          this.cdr.detectChanges();
          
          // Un segundo detectChanges para asegurar
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
          
          // Limpiar sesión automáticamente (logout) después de un breve delay
          setTimeout(() => {
            this.performLogout();
          }, 1000);
          
        } else {
          this.errorMessage = response.message || 'Error al confirmar el voto';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al confirmar voto:', err);
        this.errorMessage = err.error?.message || err.message || 'Error al confirmar el voto. Intente nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cancelar la confirmación y volver a la selección
   */
  cancelConfirmation(): void {
    this.showConfirmModal = false;
    this.isVoteIntentionSent = false;
    this.selectedCandidateId = '';
    this.selectedCandidateName = '';
    this.startTimer(); // Reanudar timer
  }

  /**
   * Auto-submit cuando expira el tiempo
   */
  autoSubmitVote(): void {
    this.votingEndTime = new Date();
    if (this.selectedCandidate === null) {
      // Si no seleccionó nada, buscar el candidato "Blanco" en la lista de candidatos
      const blancoIndex = this.candidates.findIndex(c => 
        c.name.toLowerCase().includes('blanco') || 
        c.party.toLowerCase().includes('n/a') ||
        c.party.toLowerCase().includes('na')
      );
      this.selectedCandidate = blancoIndex >= 0 ? blancoIndex : 0; // Si no encuentra "Blanco", usa el primer candidato
    }

    // Llamar selectVote para enviar la intención
    this.selectVote();
  }

  /**
   * Obtener email del usuario actual (desde la sesión si está disponible)
   */
  private getCurrentUserEmail(): string {
    // Intentar obtener el email desde localStorage o sessionStorage
    const authSession = localStorage.getItem('authSession');
    if (authSession) {
      try {
        const session = JSON.parse(authSession);
        return session.email || 'tu correo electrónico';
      } catch (e) {
        console.warn('Error parsing auth session:', e);
      }
    }
    return 'tu correo electrónico';
  }

  /**
   * Realizar logout automático después de votar
   */
  private performLogout(): void {
    // Usar el método oficial del AuthService que limpia todo correctamente
    this.authService.logoutVoter().subscribe({
      next: (response) => {
      },
      error: (error) => {
        // Incluso si hay error, el AuthService ya limpió el estado local
      }
    });
  }

  /**
   * Navegar al inicio
   */
  goToHome(): void {

    this.router.navigate(['/']);
  }

  /**
   * Navegar a resultados
   */
  goToResults(): void {
    this.router.navigate(['/results']);
  }
}
