import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface ElectionOption {
  name: string;
  party: string;
  votes: number;
  percentage: number;
}

interface Election {
  id: number;
  name: string;
  status: 'active' | 'finished';
  totalVotes: number;
  participation: number;
  options: ElectionOption[];
}

interface Province {
  name: string;
  votes: number;
  registered: number;
  participation: number;
}

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './results.html',
  styleUrl: './results.css',
})
export class ResultsComponent implements OnInit, OnDestroy {
  selectedElectionId = 1;
  currentElection: Election | null = null;
  totalRegistered = 15000;
  trendPercentage = 2.5;

  private refreshInterval: any;

  elections: Election[] = [
    {
      id: 1,
      name: 'Consulta Popular 2026',
      status: 'active',
      totalVotes: 3250,
      participation: 21.67,
      options: [
        { name: 'Alan Brito Delago', party: 'DEP', votes: 1250, percentage: 38.5 },
        { name: 'Susana Horia', party: 'Movimiento Ciudadano', votes: 980, percentage: 30.2 },
        { name: 'Armando Esteban Quito', party: 'Movimiento Libertad', votes: 520, percentage: 16.0 },
        { name: 'Jose Delgado', party: 'Movimiento Democrático', votes: 300, percentage: 9.2 },
        { name: 'Voto Blanco', party: 'Sin elección', votes: 150, percentage: 4.6 },
        { name: 'Voto Nulo', party: 'Ninguno', votes: 50, percentage: 1.5 }
      ]
    },
    {
      id: 2,
      name: 'Elección Presidencial 2025',
      status: 'finished',
      totalVotes: 12500,
      participation: 83.33,
      options: [
        { name: 'Carlos Mendoza', party: 'Partido Progreso Nacional', votes: 4800, percentage: 38.4 },
        { name: 'María Fernández', party: 'Alianza Ciudadana', votes: 4200, percentage: 33.6 },
        { name: 'Roberto Álvarez', party: 'Movimiento Renovación', votes: 2100, percentage: 16.8 },
        { name: 'Voto Blanco', party: 'Sin elección', votes: 900, percentage: 7.2 },
        { name: 'Voto Nulo', party: 'Ninguno', votes: 500, percentage: 4.0 }
      ]
    }
  ];

  provinces: Province[] = [
    { name: 'Pichincha', votes: 850, registered: 3500, participation: 24.3 },
    { name: 'Guayas', votes: 720, registered: 3200, participation: 22.5 },
    { name: 'Azuay', votes: 380, registered: 1800, participation: 21.1 },
    { name: 'Manabí', votes: 340, registered: 1500, participation: 22.7 },
    { name: 'Tungurahua', votes: 280, registered: 1200, participation: 23.3 },
    { name: 'El Oro', votes: 220, registered: 1000, participation: 22.0 },
    { name: 'Loja', votes: 180, registered: 900, participation: 20.0 },
    { name: 'Imbabura', votes: 150, registered: 800, participation: 18.8 },
    { name: 'Chimborazo', votes: 130, registered: 700, participation: 18.6 }
  ];

  ngOnInit(): void {
    this.currentElection = this.elections[0];
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  onElectionChange(): void {
    this.currentElection = this.elections.find(e => e.id === +this.selectedElectionId) || null;
  }

  startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      // Simular actualización de datos
      if (this.currentElection && this.currentElection.status === 'active') {
        this.trendPercentage = +(Math.random() * 5).toFixed(1);
      }
    }, 10000);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
