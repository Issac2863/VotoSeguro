import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectionService } from '../../../core/services/election.service';

// DTO que coincide exactamente con el backend
export interface CreateElectionBackendDto {
    nameElection: string;
    election_date: string;
    candidatos: CandidateDto[];
}

export interface CandidateDto {
    name: string;
    political_group: string;
}

@Component({
    selector: 'app-create-election',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './create-election.component.html',
    styleUrl: './create-election.component.css',
    encapsulation: ViewEncapsulation.None // Permite que los estilos CSS personalizados se apliquen
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
        // Inicializar formulario según el DTO del backend
        this.electionForm = this.fb.group({
            nameElection: ['', [Validators.required, Validators.minLength(5)]],
            election_date: ['', Validators.required],
            candidatos: this.fb.array([], [Validators.required, Validators.minLength(1)])
        });

        // Agregar un candidato por defecto
        this.addCandidate();
    }

    // Getter para facilitar acceso al FormArray de candidatos en el HTML
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
        if (this.candidatosArray.length > 1) {
            this.candidatosArray.removeAt(index);
        }
    }
    
    getTodayDate(): string {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    goBack() {
        this.router.navigate(['/admin/dashboard']);
    }

    onSubmit() {
        if (this.electionForm.invalid) {
            this.markFormGroupTouched(this.electionForm);
            return;
        }

        if (this.candidatosArray.length === 0) {
            alert('Debe agregar al menos un candidato');
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.successMessage = '';

        const electionData: CreateElectionBackendDto = this.electionForm.value;
        
        this.electionService.createElectionWithCandidates(electionData).subscribe({
            next: (response) => {
                this.isLoading = false;
                
                if (response && response.id) {
                    // Mostrar mensaje de éxito breve
                    this.successMessage = `¡Elección "${electionData.nameElection}" creada exitosamente!`;
                    
                    // Redirigir al dashboard después de un breve delay para que se vea el mensaje
                    setTimeout(() => {
                        this.router.navigate(['/admin/dashboard']);
                    }, 1500);
                } else {
                    console.error('❌ [DEBUG] Respuesta inesperada sin ID:', response);
                    this.errorMessage = 'Error: La elección no se pudo crear correctamente';
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = err.error?.message || 'Error al crear la elección';
                console.error(err);
            }
        });
    }

    // Método para marcar todos los campos como tocados (para validaciones)
    private markFormGroupTouched(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            } else if (control instanceof FormArray) {
                control.controls.forEach(arrayControl => {
                    if (arrayControl instanceof FormGroup) {
                        this.markFormGroupTouched(arrayControl);
                    }
                });
            } else {
                control?.markAsTouched();
            }
        });
    }
}
