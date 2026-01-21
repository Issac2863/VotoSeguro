import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructions.html',
  styleUrl: './instructions.css',
})
export class InstructionsComponent {
  hasReadInstructions = false;

  constructor(private router: Router) { }

  continueToVoting(): void {
    if (this.hasReadInstructions) {
      // Nuevo flujo: Instrucciones -> Login -> Ballot
      this.router.navigate(['/voter-login']);
    }
  }
}
