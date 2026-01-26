import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElectionService, Election } from '../../../core/services/election.service';
import { VotingService, CastVoteDto } from '../../../core/services/voting.service';

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

  private timerInterval: any;

  constructor(
    private router: Router,
    private electionService: ElectionService,
    private votingService: VotingService,
    private cdr: ChangeDetectorRef
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
   * Confirmar y enviar voto al backend
   */
  confirmVote(): void {
    if (this.selectedCandidate === null || !this.electionId) {
      this.errorMessage = 'Debe seleccionar una opción';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.votingEndTime = new Date();
    this.stopTimer();

    // Determinar tipo de voto y candidato
    let voteType: 'candidate' | 'blank' | 'null' = 'candidate';
    let candidateId: string | undefined = undefined;

    if (this.selectedCandidate === -1) {
      voteType = 'blank';
    } else if (this.selectedCandidate === -2) {
      voteType = 'null';
    } else if (this.selectedCandidate >= 0 && this.candidates[this.selectedCandidate]) {
      candidateId = this.candidates[this.selectedCandidate].id;
    }

    const votePayload: CastVoteDto = {
      electionId: this.electionId,
      candidateId: candidateId,
      voteType: voteType,
      tokenVotante: 'cookie-based-auth' // Ya no enviamos token, se usa cookie httpOnly
    };

    this.votingService.castVote(votePayload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          // Limpiar datos de sesión
          sessionStorage.removeItem('votingExpirationTime');

          // Mostrar mensaje de éxito y redirigir
          alert('¡Voto registrado exitosamente! Recibirás un certificado de votación en tu correo.');
          this.router.navigate(['/results']);
        } else {
          this.errorMessage = response.message || 'Error al registrar el voto';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error al enviar voto:', err);
        this.errorMessage = err.error?.message || err.message || 'Error al registrar el voto. Intente nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Auto-submit cuando expira el tiempo
   */
  autoSubmitVote(): void {
    this.votingEndTime = new Date();
    if (this.selectedCandidate === null) {
      this.selectedCandidate = -1; // Voto en blanco si no seleccionó
    }

    // Llamar confirmVote para enviar el voto
    this.confirmVote();
  }
}
