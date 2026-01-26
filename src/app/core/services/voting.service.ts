import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CastVoteDto {
    electionId: string;
    candidateId?: string;
    voteType: 'candidate' | 'blank' | 'null';
    tokenVotante: string;
}

export interface CastVoteResponse {
    success: boolean;
    message: string;
    voteId?: string;
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
     * Registrar un voto
     */
    castVote(dto: CastVoteDto): Observable<CastVoteResponse> {
        return this.http.post<CastVoteResponse>(`${this.apiUrl}/cast`, dto, { withCredentials: true });
    }

    /**
     * Obtener resultados de una elección desde el blockchain
     */
    getResults(electionId?: string): Observable<ElectionResults> {
        // Si no se especifica electionId, usar el endpoint general que trae la elección activa
        const url = electionId ? `${this.apiUrl}/results/${electionId}` : `${this.apiUrl}/results`;
        
        return this.http.get<ElectionResults>(url, { withCredentials: true }).pipe(
            map((data: any) => {
                // Procesar los datos del blockchain para compatibilidad
                const processedResults: VoteResult[] = data.votos?.map((vote: BlockchainVoteResult) => ({
                    candidateId: vote.idCandidato,
                    candidateName: vote.nombreCandidato,
                    politicalGroup: vote.nombreCandidato, // Por ahora usar el nombre como grupo
                    voteType: vote.tipoVoto,
                    voteCount: vote.conteoVotos
                })) || [];

                const totalVotes = data.votos?.reduce((sum: number, vote: BlockchainVoteResult) => 
                    sum + vote.conteoVotos, 0) || 0;

                return {
                    ...data,
                    totalVotes,
                    results: processedResults
                };
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
