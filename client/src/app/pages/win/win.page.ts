import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { InventoryService } from '../../services/inventory.service';
import { RestingService } from '../../services/resting.service';

@Component({
  selector: 'app-win-page',
  templateUrl: './win.page.html',
  styleUrl: './win.page.scss'
})
export class WinPage {
  protected readonly event = inject(EventService);
  private readonly inventory = inject(InventoryService);
  private readonly resting = inject(RestingService);
  private readonly router = inject(Router);

  protected returnHome(): void {
    this.inventory.disconnect();
    this.resting.reset();
    this.event.reset();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    this.router.navigateByUrl('/');
  }
}
