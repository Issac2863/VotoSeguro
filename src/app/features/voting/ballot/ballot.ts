import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Candidate {
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
  electionTitle = 'Elección Presidencial 2026';

  candidates: Candidate[] = [
    {
      name: 'Carlos Mendoza',
      party: 'Partido Progreso Nacional',
      number: 1,
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face'
    },
    {
      name: 'María Fernández',
      party: 'Alianza Ciudadana',
      number: 2,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face'
    },
    {
      name: 'Roberto Álvarez',
      party: 'Movimiento Renovación',
      number: 3,
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face'
    },
    {
      name: 'Ana Lucía Torres',
      party: 'Frente Democrático',
      number: 4,
      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face'
    }
  ];

  selectedCandidate: number | null = null;
  timeRemaining = 300; // 5 minutos en segundos
  votingStartTime: Date = new Date();
  votingEndTime: Date | null = null;

  private timerInterval: any;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.startTimer();
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
      // Aquí iría la lógica para enviar el voto al backend

      // Navegar a página de confirmación (por implementar)
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
