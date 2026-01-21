import { Component, OnInit, OnDestroy } from '@angular/core';
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
  timeRemaining = 300; // 5 minutos en segundos
  votingStartTime: Date = new Date();
  votingEndTime: Date | null = null;

  private timerInterval: any;

  constructor(
    private router: Router,
    private electionService: ElectionService
  ) { }

  ngOnInit(): void {
    this.loadElection();
    this.startTimer();
  }

  loadElection() {
    this.electionService.getTodayElections().subscribe({
      next: (elections) => {
        if (elections && elections.length > 0) {
          // Tomamos la primera elección activa de hoy
          const currentElection = elections[0];
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
      },
      error: (err) => {
        console.error('Error cargando elecciones:', err);
        this.electionTitle = 'Error al cargar la elección';
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
      this.router.navigate(['/']);
    }
  }

  autoSubmitVote(): void {
    this.votingEndTime = new Date();
    if (this.selectedCandidate === null) {
      this.selectedCandidate = -1; // Voto en blanco si no seleccionó
    }

    alert('Tiempo agotado. Su voto ha sido registrado.');
    this.router.navigate(['/']);
  }
}
