import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
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
  startDate: Date;
  endDate: Date;
  status: 'active' | 'pending' | 'finished';
  totalVotes: number;
  participation: number;
  options: ElectionOption[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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

  elections: Election[] = [
    {
      id: 1,
      name: 'Consulta Popular 2026',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-01-15'),
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
      endDate: new Date('2025-02-07'),
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
      startDate: [''],
      endDate: [''],
      options: ['']
    });
  }

  createElection(): void {
    const formValue = this.electionForm.value;
    const optionsList = formValue.options.split('\n').filter((o: string) => o.trim());

    const newElection: Election = {
      id: this.elections.length + 1,
      name: formValue.name,
      startDate: new Date(formValue.startDate),
      endDate: new Date(formValue.endDate),
      status: 'pending',
      totalVotes: 0,
      participation: 0,
      options: optionsList.map((opt: string) => {
        const parts = opt.split('-').map((p: string) => p.trim());
        return {
          name: parts[0] || opt,
          party: parts[1] || '',
          votes: 0,
          percentage: 0
        };
      })
    };

    this.elections.unshift(newElection);
    this.showCreateModal = false;
    this.electionForm.reset();
  }

  viewElection(election: Election): void {
    this.selectedElection = election;
  }

  logout(): void {
    localStorage.removeItem('admin_token');
    this.router.navigate(['/admin/login']);
  }
}
