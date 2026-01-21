import { Injectable } from '@nestjs/common';
import { HttpClient } from '@angular/common/http'; // Note: Front-end uses @angular/common/http, not @nestjs/common
// Correction: This is an Angular service, so remove NestJS imports and use Angular ones.

import { Injectable as AngularInjectable } from '@angular/core';
import { HttpClient as AngularHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Candidate {
    id?: string;
    name: string;
    political_group: string;
}

export interface Election {
    id?: string;
    name: string; // The backend might use name or nameElection, checking DTO... backend DTO uses nameElection for create, but entity likely uses name. Repository returns name.
    election_date: string;
    candidates: Candidate[];
}

export interface CreateElectionDto {
    nameElection: string;
    election_date: string;
    candidatos: Candidate[];
}

@AngularInjectable({
    providedIn: 'root'
})
export class ElectionService {
    private apiUrl = `${environment.apiUrl}/election`;

    constructor(private http: AngularHttpClient) { }

    createElection(data: CreateElectionDto): Observable<any> {
        return this.http.post(`${this.apiUrl}/create`, data);
    }

    getTodayElections(): Observable<Election[]> {
        return this.http.get<Election[]>(`${this.apiUrl}/candidates`); // Gateway maps 'candidates' to 'today'
    }
}
