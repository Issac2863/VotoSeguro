import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Candidate {
    id?: string;
    name: string;
    political_group: string;
}

export interface Election {
    id?: string;
    name: string;
    election_date: string;
    candidates: Candidate[];
}

// DTO para crear elección (coincide con el backend)
export interface CreateElectionDto {
    name: string;
    description?: string;
    election_date: string;
}

// DTO completo para crear elección con candidatos (estructura exacta del backend)
export interface CreateElectionWithCandidatesDto {
    nameElection: string;
    election_date: string;
    candidatos: CandidateBackendDto[];
}

export interface CandidateBackendDto {
    name: string;
    political_group: string;
}

// DTO legacy mantenido por compatibilidad
export interface CreateElectionLegacyDto {
    nameElection: string;
    election_date: string;
    candidatos: Candidate[];
}

@Injectable({
    providedIn: 'root'
})
export class ElectionService {
    private apiUrl = `${environment.apiUrl}/election`;

    constructor(private http: HttpClient) { }

    createElection(data: CreateElectionDto): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, data, { withCredentials: true });
    }

    createElectionWithCandidates(data: CreateElectionWithCandidatesDto): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, data, { withCredentials: true });
    }

    getTodayElections(): Observable<Election[]> {
        return this.http.get<Election[]>(`${this.apiUrl}/candidates`, { withCredentials: true });
    }

    getAllElections(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all`, { withCredentials: true });
    }
}
