import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElectionService, Election } from '../../../core/services/election.service';

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
  candidates: Candidate[] = [];

  selectedCandidate: number | null = null;
  timeRemaining = 300; // 5 minutos por defecto
  votingStartTime: Date = new Date();
  votingEndTime: Date | null = null;

  private timerInterval: any;

  constructor(
    private router: Router,
    private electionService: ElectionService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeTimer();
    this.loadElection();
    this.startTimer();
  }

  /**
   * Inicializa el timer basado en el tiempo de expiración del token
   * almacenado en localStorage (viene del backend)
   */
  private initializeTimer(): void {
    const storedExpiration = localStorage.getItem('votingExpirationTime');
    if (storedExpiration) {
      const expirationTimestamp = parseInt(storedExpiration, 10);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remaining = expirationTimestamp - nowInSeconds;

      if (remaining > 0) {
        this.timeRemaining = remaining;
        // Calcular cuando empezó la votación basado en el tiempo de expiración
        // Asumiendo que el tiempo total era de 10 minutos (600 segundos) - ajustar si es diferente
        const totalVotingTime = 600; // 10 minutos de votación
        this.votingStartTime = new Date((expirationTimestamp - totalVotingTime) * 1000);
      } else {
        // Tiempo expirado
        this.timeRemaining = 0;
      }
    }
  }

  loadElection() {
    this.electionService.getTodayElections().subscribe({
      next: (elections) => {
        if (elections && elections.length > 0) {
          // Tomamos la última elección creada (más reciente)
          const currentElection = elections[elections.length - 1];
          this.electionTitle = currentElection.name;

          // Mapear candidatos del backend al frontend
          this.candidates = currentElection.candidates.map((c, index) => ({
            id: c.id,
            name: c.name,
            party: c.political_group,
            number: index + 1,
            // Foto placeholder aleatoria pero consistente
            photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=200`
          }));
        } else {
          this.electionTitle = 'No hay elecciones activas para hoy';
        }
        // Forzar actualización de la UI
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
        // Forzar actualización del timer en la UI
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
  }

  confirmVote(): void {
    if (this.selectedCandidate !== null) {
      this.votingEndTime = new Date();
      this.stopTimer();

      // TODO: Integrar con el servicio de votación real usando el ID del candidato
      // const candidateId = this.selectedCandidate === -1 ? 'BLANK' : this.candidates[this.selectedCandidate].id;

      alert('¡Voto registrado exitosamente!');
      // Limpiar el tiempo de expiración después de votar
      localStorage.removeItem('votingExpirationTime');
      this.router.navigate(['/']);
    }
  }

  autoSubmitVote(): void {
    this.votingEndTime = new Date();
    if (this.selectedCandidate === null) {
      this.selectedCandidate = -1; // Voto en blanco si no seleccionó
    }

    alert('Tiempo agotado. Su voto ha sido registrado.');
    // Limpiar el tiempo de expiración
    localStorage.removeItem('votingExpirationTime');
    this.router.navigate(['/']);
  }
}
