import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ElectionService } from '../../../core/services/election.service';

interface ElectionOption {
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

interface Election {
  id: number;
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
  electionForm: FormGroup;

  candidatesList: CandidateInput[] = [
    { name: '', party: '' },
    { name: '', party: '' }
  ];

  elections: Election[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private electionService: ElectionService
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
      next: (data) => {
        this.elections = data.map(e => {
          const electionDate = new Date(e.election_date);
          const today = new Date();
          // Resetear horas para comparar solo fechas
          today.setHours(0, 0, 0, 0);
          const eDate = new Date(electionDate);
          eDate.setHours(0, 0, 0, 0);

          let status: 'active' | 'pending' | 'finished' = 'pending';
          if (eDate.getTime() === today.getTime()) status = 'active';
          else if (eDate.getTime() < today.getTime()) status = 'finished';
          else status = 'pending';

          return {
            id: e.id,
            name: e.name,
            description: 'Elección cargada del sistema',
            startDate: electionDate,
            startTime: '07:00',
            endDate: electionDate,
            endTime: '17:00',
            status: status,
            totalVotes: 0, // Placeholder
            participation: 0,
            options: e.candidates ? e.candidates.map((c: any) => ({
              name: c.name,
              party: c.political_group,
              votes: 0,
              percentage: 0
            })) : []
          } as Election;
        });

        // Calcular stats generales (mock por ahora)
        this.totalVotes = this.elections.reduce((acc, curr) => acc + curr.totalVotes, 0);
      },
      error: (err) => console.error('Error cargando elecciones', err)
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

  viewElection(election: Election): void {
    this.selectedElection = election;
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    this.router.navigate(['/admin/login']);
  }
}
