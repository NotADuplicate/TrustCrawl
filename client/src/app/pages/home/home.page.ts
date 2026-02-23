import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-home-page',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage {
  protected readonly inventory = inject(InventoryService);
  private readonly router = inject(Router);

  constructor() {
    this.inventory.onGameStarted(() => {
      this.router.navigateByUrl('/resting');
    });
  }
}
