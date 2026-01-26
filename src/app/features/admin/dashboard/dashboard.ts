import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ElectionService } from '../../../core/services/election.service';
import { AuthService } from '../../../core/services/auth';
import { VotingService } from '../../../core/services/voting.service';

interface ElectionOption {
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

interface Election {
  id: string; // UUID string from backend
  name: string;
  description?: string;
  startDate: Date;
  startTime?: string;
  endDate: Date;
  endTime?: string;
  status: 'active' | 'pending' | 'finished';
  totalVotes: number;
  participation: number;
  options: ElectionOption[];
  candidatos?: Candidate[]; // Agregamos los candidatos del backend
}

interface Candidate {
  name: string;
  political_group: string;
}

interface CandidateInput {
  name: string;
  party: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  totalUsers = 15000;
  totalVotes = 0;
  participation = 0;

  showCreateModal = false;
  selectedElection: Election | null = null;
  showCandidatesModal = false;
  selectedElectionForCandidates: Election | null = null;
  electionForm: FormGroup;

  candidatesList: CandidateInput[] = [
    { name: '', party: '' },
    { name: '', party: '' }
  ];

  elections: Election[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private electionService: ElectionService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private votingService: VotingService
  ) {
    this.electionForm = this.fb.group({
      name: [''],
      description: [''],
      startDate: [''],
      startTime: ['07:00'],
      endDate: [''],
      endTime: ['17:00']
    });
  }

  ngOnInit() {
    this.loadElections();
  }

  loadElections() {
    
    this.electionService.getAllElections().subscribe({
      next: (data: any[]) => {
        
        this.elections = data.map((e: any, index: number) => {
          
          const electionDate = new Date(e.election_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const eDate = new Date(electionDate);
          eDate.setHours(0, 0, 0, 0);

          let status: 'active' | 'pending' | 'finished' = 'pending';
          if (eDate.getTime() === today.getTime()) status = 'active';
          else if (eDate.getTime() < today.getTime()) status = 'finished';
          else status = 'pending';

          const mappedElection = {
            id: e.id || `election_${index}_${Date.now()}`,
            name: e.name,
            description: e.description || 'Elección cargada del sistema',
            startDate: electionDate,
            startTime: '07:00',
            endDate: electionDate,
            endTime: '17:00',
            status: status,
            totalVotes: 0, // Se actualizará con datos reales
            participation: 0, // Se actualizará con datos reales
            candidatos: e.candidates || [],
            options: e.candidates ? e.candidates.map((c: any) => ({
              name: c.name,
              party: c.political_group,
              votes: 0,
              percentage: 0
            })) : []
          } as Election;
          
          return mappedElection;
        });

        // Obtener datos de votación reales
        this.loadVotingData();
        
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error cargando elecciones', err);
      }
    });
  }

  addCandidate(): void {
    this.candidatesList.push({ name: '', party: '' });
  }

  removeCandidate(index: number): void {
    if (this.candidatesList.length > 1) {
      this.candidatesList.splice(index, 1);
    }
  }

  // Método legacy conservado por compatibilidad del template, 
  // pero la creación real ahora se hace en CreateElectionComponent
  createElection(): void {
    const formValue = this.electionForm.value;
    // ... lógica legacy omitida ...
    alert('Por favor use el botón "Crear Nueva Votación" para ir al nuevo formulario.');
    this.showCreateModal = false;
  }

  // Método para trackBy en ngFor - mejora performance
  trackElection(index: number, election: Election): string {
    return election.id?.toString() || index.toString();
  }

  // Método para obtener texto del status traducido
  getStatusText(status: 'active' | 'pending' | 'finished'): string {
    switch (status) {
      case 'active': return 'Activa';
      case 'finished': return 'Finalizada';
      case 'pending': return 'Pendiente';
      default: return 'Desconocido';
    }
  }

  // Método para mostrar candidatos en modal
  viewCandidates(election: Election): void {
    this.selectedElectionForCandidates = election;
    this.showCandidatesModal = true;
  }

  // Método para cerrar modal de candidatos
  closeCandidatesModal(): void {
    this.showCandidatesModal = false;
    this.selectedElectionForCandidates = null;
  }

  // Método para cargar datos de votación reales
  loadVotingData(): void {
    this.votingService.getResults().subscribe({
      next: (votingData: any) => {
        this.updateElectionsWithVotingData(votingData);
      },
      error: (err: any) => {
        // Mantener los valores por defecto (0 votos)
        this.updateStats();
      }
    });
  }

  // Método para actualizar elecciones con datos reales de votación
  private updateElectionsWithVotingData(votingData: any): void {
    if (votingData && votingData.candidates) {
      const currentElection = this.elections.find(e => e.status === 'active');
      if (currentElection) {
        const totalVotes = votingData.candidates.reduce((sum: number, candidate: any) => 
          sum + (candidate.totalVotes || 0), 0);
        
        currentElection.totalVotes = totalVotes;
        currentElection.participation = this.calculateParticipation(totalVotes);
      }
    }
    
    this.updateStats();
  }

  // Calcular participación como porcentaje
  private calculateParticipation(totalVotes: number): number {
    const totalRegistered = 15000; // Esto debería venir de un servicio
    return totalVotes > 0 ? Math.round((totalVotes / totalRegistered) * 100 * 10) / 10 : 0;
  }

  // Actualizar estadísticas generales
  private updateStats(): void {
    this.totalVotes = this.elections.reduce((acc, curr) => acc + curr.totalVotes, 0);
    this.participation = this.calculateParticipation(this.totalVotes);
    
    this.cdr.detectChanges();
  }

  logout(): void {
    this.authService.logoutAdmin().subscribe({
      next: (response) => {
        this.router.navigate(['/admin/login']);
      },
      error: (error) => {
        this.router.navigate(['/admin/login']);
      }
    });
  }
}
