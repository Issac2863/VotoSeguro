import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
export class DashboardComponent {
  totalUsers = 15000;
  totalVotes = 0;
  participation = 0;

  showCreateModal = false;
  selectedElection: Election | null = null;

  electionForm: FormGroup;

  // Lista de candidatos para el formulario
  candidatesList: CandidateInput[] = [
    { name: '', party: '' },
    { name: '', party: '' }
  ];

  elections: Election[] = [
    {
      id: 1,
      name: 'Consulta Popular 2026',
      startDate: new Date('2026-01-15'),
      startTime: '07:00',
      endDate: new Date('2026-01-15'),
      endTime: '17:00',
      status: 'active',
      totalVotes: 0,
      participation: 0,
      options: [
        { name: 'Alan Brito Delago', party: 'DEP', votes: 0, percentage: 0 },
        { name: 'Susana Horia', party: 'Movimiento Ciudadano', votes: 0, percentage: 0 },
        { name: 'Armando Esteban Quito', party: 'Movimiento Libertad', votes: 0, percentage: 0 },
        { name: 'Jose Delgado', party: 'Movimiento Democrático', votes: 0, percentage: 0 },
        { name: 'Voto Blanco', party: 'Sin elección', votes: 0, percentage: 0 },
        { name: 'Voto Nulo', party: 'Ninguno', votes: 0, percentage: 0 }
      ]
    },
    {
      id: 2,
      name: 'Elección Presidencial 2025',
      startDate: new Date('2025-02-07'),
      startTime: '07:00',
      endDate: new Date('2025-02-07'),
      endTime: '17:00',
      status: 'finished',
      totalVotes: 8500,
      participation: 56.67,
      options: [
        { name: 'Carlos Mendoza', party: 'Partido Progreso Nacional', votes: 3200, percentage: 37.6 },
        { name: 'María Fernández', party: 'Alianza Ciudadana', votes: 2800, percentage: 32.9 },
        { name: 'Roberto Álvarez', party: 'Movimiento Renovación', votes: 1500, percentage: 17.6 },
        { name: 'Voto Blanco', party: 'Sin elección', votes: 700, percentage: 8.2 },
        { name: 'Voto Nulo', party: 'Ninguno', votes: 300, percentage: 3.5 }
      ]
    }
  ];

  constructor(private fb: FormBuilder, private router: Router) {
    this.electionForm = this.fb.group({
      name: [''],
      description: [''],
      startDate: [''],
      startTime: ['07:00'],
      endDate: [''],
      endTime: ['17:00']
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

  createElection(): void {
    const formValue = this.electionForm.value;

    // Crear opciones desde la lista de candidatos
    const candidateOptions: ElectionOption[] = this.candidatesList
      .filter(c => c.name.trim())
      .map(c => ({
        name: c.name.trim(),
        party: c.party.trim(),
        votes: 0,
        percentage: 0
      }));

    // Agregar Voto Blanco y Voto Nulo automáticamente
    candidateOptions.push(
      { name: 'Voto Blanco', party: 'Sin elección', votes: 0, percentage: 0 },
      { name: 'Voto Nulo', party: 'Ninguno', votes: 0, percentage: 0 }
    );

    const newElection: Election = {
      id: this.elections.length + 1,
      name: formValue.name,
      description: formValue.description,
      startDate: new Date(formValue.startDate),
      startTime: formValue.startTime,
      endDate: new Date(formValue.endDate),
      endTime: formValue.endTime,
      status: 'pending',
      totalVotes: 0,
      participation: 0,
      options: candidateOptions
    };

    this.elections.unshift(newElection);
    this.showCreateModal = false;
    this.electionForm.reset({
      startTime: '07:00',
      endTime: '17:00'
    });
    this.candidatesList = [
      { name: '', party: '' },
      { name: '', party: '' }
    ];
  }

  viewElection(election: Election): void {
    this.selectedElection = election;
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    this.router.navigate(['/admin/login']);
  }
}
