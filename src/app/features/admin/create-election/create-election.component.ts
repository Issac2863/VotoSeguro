import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectionService, CreateElectionDto } from '../../../core/services/election.service';

@Component({
    selector: 'app-create-election',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './create-election.component.html',
    styleUrl: './create-election.component.css'
})
export class CreateElectionComponent {
    electionForm: FormGroup;
    isLoading = false;
    successMessage = '';
    errorMessage = '';

    constructor(
        private fb: FormBuilder,
        private electionService: ElectionService, // Usa el nuevo servicio
        private router: Router
    ) {
        // Inicializar formulario
        this.electionForm = this.fb.group({
            nameElection: ['', [Validators.required, Validators.minLength(5)]],
            election_date: ['', Validators.required],
            candidatos: this.fb.array([], Validators.required) // Array dinámico
        });

        // Agregar un candidato por defecto
        this.addCandidate();
    }

    // Getter para facilitar acceso al FormArray en el HTML
    get candidatosArray() {
        return this.electionForm.get('candidatos') as FormArray;
    }

    // Método para agregar un nuevo candidato
    addCandidate() {
        const candidateGroup = this.fb.group({
            name: ['', Validators.required],
            political_group: ['', Validators.required]
        });
        this.candidatosArray.push(candidateGroup);
    }

    // Método para eliminar un candidato
    removeCandidate(index: number) {
        this.candidatosArray.removeAt(index);
    }

    onSubmit() {
        if (this.electionForm.invalid) return;
        if (this.candidatosArray.length === 0) {
            alert('Debe agregar al menos un candidato');
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        const electionData: CreateElectionDto = this.electionForm.value;

        this.electionService.createElection(electionData).subscribe({
            next: (res) => {
                this.isLoading = false;
                this.successMessage = '¡Elección creada exitosamente!';
                this.electionForm.reset();
                // Opcional: Redirigir o limpiar candidatos
                this.candidatosArray.clear();
                this.addCandidate();
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Error al crear la elección';
                console.error(err);
            }
        });
    }
}
