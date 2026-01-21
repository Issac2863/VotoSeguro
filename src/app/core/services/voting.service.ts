import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

export interface ElectionResults {
    electionId: string;
    electionName: string;
    totalVotes: number;
    results: VoteResult[];
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
     * Obtener resultados de una elección
     */
    getResults(electionId: string): Observable<ElectionResults> {
        return this.http.get<ElectionResults>(`${this.apiUrl}/results/${electionId}`, { withCredentials: true });
    }

    /**
     * Verificar si el usuario ya votó
     */
    checkVote(token: string, electionId: string): Observable<{ hasVoted: boolean }> {
        return this.http.post<{ hasVoted: boolean }>(`${this.apiUrl}/check`, { token, electionId }, { withCredentials: true });
    }
}
