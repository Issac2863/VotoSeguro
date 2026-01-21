import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ElectionService, Election } from '../../core/services/election.service';
import { VotingService, ElectionResults, VoteResult } from '../../core/services/voting.service';

interface ElectionOption {
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

interface ElectionDisplay {
  id: string;
  name: string;
  status: 'active' | 'finished';
  totalVotes: number;
  participation: number;
  options: ElectionOption[];
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class ResultsComponent implements OnInit, OnDestroy {
  selectedElectionId = '';
  currentElection: ElectionDisplay | null = null;
  totalRegistered = 15000; // Esto debería venir de un servicio de censo
  trendPercentage = 0;
  isLoading = true;
  errorMessage = '';

  elections: ElectionDisplay[] = [];
  provinces: any[] = []; // Placeholder - sin datos reales por ahora

  private refreshInterval: any;

  constructor(
    private electionService: ElectionService,
    private votingService: VotingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadElections();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Cargar lista de elecciones disponibles
   */
  loadElections(): void {
    this.isLoading = true;
    this.electionService.getAllElections().subscribe({
      next: (elections) => {
        if (elections && elections.length > 0) {
          // Convertir al formato de display
          this.elections = elections.map(e => this.mapToDisplay(e));

          // Seleccionar la primera elección por defecto
          if (this.elections.length > 0) {
            this.selectedElectionId = this.elections[0].id;
            this.loadResults(this.selectedElectionId);
          }
        } else {
          this.isLoading = false;
          this.errorMessage = 'No hay elecciones disponibles';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando elecciones:', err);
        this.isLoading = false;
        this.errorMessage = 'Error al cargar elecciones';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Cargar resultados de una elección específica
   */
  loadResults(electionId: string): void {
    this.votingService.getResults(electionId).subscribe({
      next: (results) => {
        this.isLoading = false;

        // Actualizar la elección actual con los resultados
        const election = this.elections.find(e => e.id === electionId);
        if (election) {
          election.totalVotes = results.totalVotes;
          election.participation = this.calculateParticipation(results.totalVotes);
          election.options = this.mapResults(results.results, results.totalVotes);
          this.currentElection = election;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando resultados:', err);
        this.isLoading = false;
        // Si no hay resultados, aún mostrar la elección con 0 votos
        const election = this.elections.find(e => e.id === electionId);
        if (election) {
          election.totalVotes = 0;
          election.participation = 0;
          election.options = [];
          this.currentElection = election;
        }
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Mapear elección del backend al formato de display
   */
  private mapToDisplay(e: any): ElectionDisplay {
    const today = new Date().toISOString().split('T')[0];
    const electionDate = e.election_date?.split('T')[0] || '';

    return {
      id: e.id,
      name: e.name,
      status: electionDate === today ? 'active' : 'finished',
      totalVotes: 0,
      participation: 0,
      options: []
    };
  }

  /**
   * Mapear resultados de votación al formato de display
   */
  private mapResults(results: VoteResult[], totalVotes: number): ElectionOption[] {
    if (!results || results.length === 0) return [];

    return results.map(r => ({
      name: r.candidateName || (r.voteType === 'blank' ? 'Voto en Blanco' : 'Voto Nulo'),
      party: r.politicalGroup || 'N/A',
      votes: r.voteCount,
      percentage: totalVotes > 0 ? Math.round((r.voteCount / totalVotes) * 100 * 10) / 10 : 0
    }));
  }

  /**
   * Calcular porcentaje de participación
   */
  private calculateParticipation(totalVotes: number): number {
    if (this.totalRegistered === 0) return 0;
    return Math.round((totalVotes / this.totalRegistered) * 100 * 10) / 10;
  }

  onElectionChange(): void {
    if (this.selectedElectionId) {
      this.isLoading = true;
      this.loadResults(this.selectedElectionId);
    }
  }

  startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (this.selectedElectionId && this.currentElection?.status === 'active') {
        this.loadResults(this.selectedElectionId);
        this.trendPercentage = +(Math.random() * 3).toFixed(1);
      }
    }, 10000); // Cada 10 segundos
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
