import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService, type GameDifficulty } from '../../services/inventory.service';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage {
  protected readonly inventory = inject(InventoryService);
  protected selectedDifficulty: GameDifficulty = 'normal';
  private readonly router = inject(Router);

  constructor() {
    this.inventory.onGameStarted(() => {
      this.router.navigateByUrl('/resting');
    });
  }

  protected showReconnectHint(): boolean {
    return !this.inventory.connected && this.inventory.state.name.trim().length > 0;
  }

  protected setDifficulty(difficulty: GameDifficulty): void {
    this.selectedDifficulty = difficulty;
  }

  protected startGame(): void {
    this.inventory.startGame(this.selectedDifficulty);
  }
}
