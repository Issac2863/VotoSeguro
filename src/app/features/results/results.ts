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
    // Llamar al endpoint general que trae la elección activa
    this.votingService.getResults().subscribe({
      next: (results) => {
        this.isLoading = false;
        this.processElectionResults(results);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando resultados:', err);
        this.isLoading = false;
        this.errorMessage = 'Error al cargar resultados de la elección';
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Procesar y mostrar los resultados de la elección
   */
  private processElectionResults(results: ElectionResults): void {
    // Crear la estructura de display con los datos reales
    this.currentElection = {
      id: results.electionId || 'unknown',
      name: results.electionName || 'Elección del día',
      status: 'active', // Asumimos que es activa si está disponible
      totalVotes: results.totalVotes,
      participation: this.calculateParticipation(results.totalVotes),
      options: this.mapBlockchainResults(results.votos || [], results.totalVotes)
    };

    // También actualizar la lista de elecciones
    this.elections = [this.currentElection];
    this.selectedElectionId = this.currentElection.id;
  }

  /**
   * Mapear resultados del blockchain al formato de display
   */
  private mapBlockchainResults(votos: any[], totalVotes: number): ElectionOption[] {
    if (!votos || votos.length === 0) return [];

    return votos.map(vote => ({
      name: vote.nombreCandidato || this.getVoteTypeName(vote.tipoVoto),
      party: this.extractPartyName(vote.nombreCandidato),
      votes: vote.conteoVotos || 0,
      percentage: totalVotes > 0 ? Math.round((vote.conteoVotos / totalVotes) * 100 * 10) / 10 : 0
    }))
    .sort((a, b) => b.votes - a.votes); // Ordenar por mayor cantidad de votos
  }

  /**
   * Obtener nombre legible para tipos de voto especiales
   */
  private getVoteTypeName(tipoVoto: string): string {
    switch (tipoVoto?.toLowerCase()) {
      case 'blank':
      case 'blanco':
        return 'Voto en Blanco';
      case 'null':
      case 'nulo':
        return 'Voto Nulo';
      default:
        return tipoVoto || 'Candidato';
    }
  }

  /**
   * Extraer nombre del partido del nombre del candidato (si aplica)
   */
  private extractPartyName(nombreCandidato: string): string {
    if (!nombreCandidato) return 'N/A';
    
    // Aquí puedes implementar lógica para extraer el partido
    // Por ejemplo, si el formato es "Nombre Apellido - Partido"
    const parts = nombreCandidato.split(' - ');
    return parts.length > 1 ? parts[1] : 'Independiente';
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
  getProgressBarColor(percentage: number): string {
    if (percentage >= 40) return '#22c55e'; // Verde
    if (percentage >= 25) return '#f59e0b'; // Amarillo
    if (percentage >= 15) return '#ef4444'; // Rojo
    return '#6b7280'; // Gris
  }

  /**
   * Formatear número con separadores de miles
   */
  formatNumber(num: number): string {
    return num.toLocaleString('es-ES');
  }
}
