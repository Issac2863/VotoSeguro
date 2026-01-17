import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login';
import { DashboardComponent } from './features/admin/dashboard/dashboard';
import { AdminLoginComponent } from './features/admin/admin-login/admin-login';
import { LandingComponent } from './features/landing/landing';
import { InstructionsComponent } from './features/voting/instructions/instructions';
import { BallotComponent } from './features/voting/ballot/ballot';
import { ResultsComponent } from './features/results/results';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'voter-login', component: LoginComponent },
    { path: 'voting/instructions', component: InstructionsComponent },
    { path: 'voting/ballot', component: BallotComponent },
    { path: 'results', component: ResultsComponent },
    { path: 'admin/login', component: AdminLoginComponent },
    { path: 'admin/dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'admin/results', component: ResultsComponent },
    { path: 'admin-dashboard', redirectTo: 'admin/dashboard' },
    { path: '**', redirectTo: '' }
];
