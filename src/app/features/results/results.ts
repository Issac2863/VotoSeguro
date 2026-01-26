import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ElectionService, Election } from '../../core/services/election.service';
import { VotingService, ElectionResults, VoteResult } from '../../core/services/voting.service';

interface Candidate {
  id: string;
  name: string;
  politicalGroup: string;
  totalVotes?: number; // Votos reales del backend
  votes?: number; // Votos procesados para display
  percentage?: number;
}

interface ElectionData {
  electionId: string;
  electionName: string;
  electionDate: string;
  candidates: Candidate[];
}

interface ElectionOption {
  name: string;
  party: string;
  votes: number;
  percentage: number;
  isSpecialVote: boolean;
}

interface ElectionDisplay {
  id: string;
  name: string;
  date: string;
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
    this.loadCurrentElectionResults();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Cargar resultados de la elección actual (del día de hoy)
   */
  loadCurrentElectionResults(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Llamar al endpoint que trae los datos de la elección con candidatos
    this.votingService.getResults().subscribe({
      next: (electionData: ElectionData) => {
        this.isLoading = false;
        this.processElectionData(electionData);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando resultados:', err);
        this.isLoading = false;
        this.errorMessage = 'Error al cargar resultados de la elección. Por favor, inténtalo de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Procesar y mostrar los datos de la elección
   */
  private processElectionData(electionData: any): void {
    
    // Validar que tenemos datos básicos
    if (!electionData) {
      console.warn('⚠️ No se recibieron datos de elección');
      this.showNoDataError();
      return;
    }

    // Validar que hay candidatos
    if (!electionData.candidates || !Array.isArray(electionData.candidates) || electionData.candidates.length === 0) {
      console.warn('⚠️ No se encontraron candidatos en los datos:', electionData);
      this.showNoCandidatesState(electionData);
      return;
    }

    // Usar los votos reales del backend
    const candidatesWithVotes = this.processRealVotes(electionData.candidates);
    const totalVotes = candidatesWithVotes.reduce((sum, candidate) => sum + (candidate.votes || 0), 0);
    
    this.currentElection = {
      id: electionData.electionId || 'unknown',
      name: electionData.electionName || 'Elección del día',
      date: electionData.electionDate || new Date().toISOString().split('T')[0],
      status: this.isElectionActive(electionData.electionDate) ? 'active' : 'finished',
      totalVotes: totalVotes,
      participation: this.calculateParticipation(totalVotes),
      options: this.mapCandidatesToOptions(candidatesWithVotes, totalVotes)
    };

    // También actualizar la lista de elecciones
    this.elections = [this.currentElection];
    this.selectedElectionId = this.currentElection.id;
    
  }

  /**
   * Mapear candidatos a opciones de visualización
   */
  private mapCandidatesToOptions(candidates: Candidate[], totalVotes: number): ElectionOption[] {
    return candidates.map(candidate => ({
      name: candidate.name,
      party: candidate.politicalGroup === 'NA' ? 'N/A' : candidate.politicalGroup,
      votes: candidate.votes || 0,
      percentage: totalVotes > 0 ? Math.round((candidate.votes! / totalVotes) * 100 * 10) / 10 : 0,
      isSpecialVote: candidate.name.toLowerCase() === 'blanco' || candidate.name.toLowerCase() === 'nulo'
    }))
    .sort((a, b) => {
      // Primero candidatos regulares por votos, luego votos especiales
      if (a.isSpecialVote && !b.isSpecialVote) return 1;
      if (!a.isSpecialVote && b.isSpecialVote) return -1;
      return b.votes - a.votes;
    });
  }

  /**
   * Procesar los votos reales que vienen del backend
   */
  private processRealVotes(candidates: Candidate[]): Candidate[] {
    if (!candidates || !Array.isArray(candidates)) {
      console.warn('⚠️ processRealVotes: candidates no es un array válido:', candidates);
      return [];
    }

    return candidates.map(candidate => ({
      ...candidate,
      votes: candidate.totalVotes || 0 // Usar totalVotes del backend
    }));
  }

  /**
   * Simular votos para demostración (SOLO para testing cuando no hay votos reales)
   */
  private simulateVotes(candidates: Candidate[]): Candidate[] {
    if (!candidates || !Array.isArray(candidates)) {
      console.warn('⚠️ simulateVotes: candidates no es un array válido:', candidates);
      return [];
    }

    console.warn('⚠️ [DEMO MODE] Simulando votos - esto solo debería ocurrir en desarrollo');

    // Generar votos realistas con distribución más realista
    const totalVotesRange = 12000; // Base de votos
    const voteDistribution = [0.35, 0.28, 0.22, 0.08, 0.07]; // Distribución porcentual
    
    return candidates.map((candidate, index) => {
      let votes: number;
      
      if (candidate.name?.toLowerCase() === 'blanco') {
        votes = Math.floor(Math.random() * 500) + 200;
      } else if (candidate.name?.toLowerCase() === 'nulo') {
        votes = Math.floor(Math.random() * 300) + 100;
      } else {
        // Usar distribución realista para candidatos principales
        const baseVotes = Math.floor(totalVotesRange * (voteDistribution[index] || 0.05));
        votes = baseVotes + Math.floor(Math.random() * 1000) - 500; // ±500 variación
        votes = Math.max(votes, 100); // Mínimo 100 votos
      }
      
      return {
        ...candidate,
        votes: votes
      };
    });
  }

  /**
   * Verificar si la elección está activa basada en la fecha
   */
  private isElectionActive(electionDate: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return electionDate === today;
  }

  /**
   * Calcular porcentaje de participación
   */
  private calculateParticipation(totalVotes: number): number {
    if (this.totalRegistered === 0) return 0;
    return Math.round((totalVotes / this.totalRegistered) * 100 * 10) / 10;
  }

  /**
   * Refrescar los resultados manualmente
   */
  refreshResults(): void {
    if (!this.isLoading) {
      this.loadCurrentElectionResults();
    }
  }

  /**
   * Cambiar elección seleccionada (si hay múltiples)
   */
  onElectionChange(): void {
    // Por ahora solo manejamos la elección actual
    this.refreshResults();
  }

  /**
   * Iniciar actualización automática cada 30 segundos
   */
  startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (this.currentElection?.status === 'active') {
        this.loadCurrentElectionResults();
        // Simular pequeña tendencia para mostrar actividad
        this.trendPercentage = +(Math.random() * 3).toFixed(1);
      }
    }, 30000); // Cada 30 segundos para no sobrecargar
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Obtener el color para la barra de progreso basado en el porcentaje
   */
  getProgressBarColor(percentage: number, isSpecialVote = false): string {
    if (isSpecialVote) {
      return '#9ca3af'; // Gris para votos especiales (blanco/nulo)
    }
    if (percentage >= 40) return '#22c55e'; // Verde
    if (percentage >= 25) return '#f59e0b'; // Amarillo
    if (percentage >= 15) return '#ef4444'; // Rojo
    return '#6b7280'; // Gris
  }

  /**
   * Formatear la fecha de la elección para mostrar
   */
  formatElectionDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Mostrar estado cuando no hay datos de elección
   */
  private showNoDataError(): void {
    this.currentElection = null;
    this.errorMessage = 'No se pudieron cargar los datos de la elección. Verifica que el servicio esté funcionando correctamente.';
  }

  /**
   * Mostrar estado cuando no hay candidatos registrados
   */
  private showNoCandidatesState(electionData: any): void {
    this.currentElection = {
      id: electionData?.electionId || 'unknown',
      name: electionData?.electionName || 'Elección del día',
      date: electionData?.electionDate || new Date().toISOString().split('T')[0],
      status: 'active',
      totalVotes: 0,
      participation: 0,
      options: []
    };
    this.elections = [this.currentElection];
    this.selectedElectionId = this.currentElection.id;
  }

  /**
   * Formatear número con separadores de miles
   */
  formatNumber(num: number): string {
    return num.toLocaleString('es-ES');
  }
}
