import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CastVoteDto {
    electionId: string;
    candidateId?: string;
    voteType: 'candidate' | 'blank' | 'null';
    tokenVotante: string;
}

export interface CastVoteResponse {
    success?: boolean;
    message: string;
    voteId?: string;
    status?: string;
}

export interface VoteResult {
    candidateId: string | null;
    candidateName: string | null;
    politicalGroup: string | null;
    voteType: string;
    voteCount: number;
}

export interface BlockchainVoteResult {
    idCandidato: string;
    nombreCandidato: string;
    tipoVoto: string;
    conteoVotos: number;
}

export interface ElectionResults {
    electionId: string;
    electionName?: string;
    totalVotes: number;
    votos: BlockchainVoteResult[]; // Estructura que viene del blockchain
    results?: VoteResult[]; // Estructura procesada para compatibilidad
}

@Injectable({
    providedIn: 'root'
})
export class VotingService {
    private apiUrl = `${environment.apiUrl}/voting`;

    constructor(private http: HttpClient) { }

    /**
     * Registrar un voto (intención)
     */
    castVote(candidateId: string): Observable<CastVoteResponse> {
        // El backend solo espera { candidateId: string }
        const payload = { candidateId };
        
        return this.http.post<CastVoteResponse>(`${this.apiUrl}/cast`, payload, { 
            withCredentials: true 
        }).pipe(
            tap(response => {
            }),
            catchError(error => {
                console.error('❌ [DEBUG] VotingService.castVote - Error:', {
                    status: error.status,
                    message: error.message,
                    url: error.url,
                    withCredentials: 'activado'
                });
                throw error;
            })
        );
    }

    /**
     * Confirmar definitivamente el voto
     */
    confirmVote(candidateId: string): Observable<CastVoteResponse> {
        // El backend solo espera { candidateId: string }
        const payload = { candidateId };
        return this.http.post<CastVoteResponse>(`${this.apiUrl}/confirm`, payload, { withCredentials: true });
    }

    /**
     * Obtener resultados de una elección desde el backend
     */
    getResults(electionId?: string): Observable<any> {
        // Si no se especifica electionId, usar el endpoint general que trae la elección activa
        const url = electionId ? `${this.apiUrl}/results/${electionId}` : `${this.apiUrl}/results`;
        
        return this.http.get<any>(url, { withCredentials: true }).pipe(
            tap(response => {
            }),
            catchError(error => {
                console.error('❌ [DEBUG] VotingService.getResults - Error:', error);
                throw error;
            })
        );
    }

    /**
     * Verificar si el usuario ya votó
     */
    checkVote(token: string, electionId: string): Observable<{ hasVoted: boolean }> {
        return this.http.post<{ hasVoted: boolean }>(`${this.apiUrl}/check`, { token, electionId }, { withCredentials: true });
    }
}
