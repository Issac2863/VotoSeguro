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

export interface CreateElectionDto {
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
        return this.http.post(`${this.apiUrl}/create`, data);
    }

    getTodayElections(): Observable<Election[]> {
        return this.http.get<Election[]>(`${this.apiUrl}/candidates`); // Gateway maps 'candidates' to 'today'
    }

    getAllElections(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all`);
    }
}
