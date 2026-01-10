import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login';
import { DashboardComponent } from './features/admin/dashboard/dashboard';
import { LandingComponent } from './features/landing/landing';
import { InstructionsComponent } from './features/voting/instructions/instructions';
import { BallotComponent } from './features/voting/ballot/ballot';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'voter-login', component: LoginComponent },
    { path: 'voting/instructions', component: InstructionsComponent },
    { path: 'voting/ballot', component: BallotComponent },
    { path: 'admin-dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
